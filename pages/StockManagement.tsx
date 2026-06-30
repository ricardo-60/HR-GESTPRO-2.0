import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useInventory } from '../hooks/useInventory';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

// Ícones inline (lucide-react não está disponível como dependência direta neste módulo)
const Icons = {
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  camera: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
  plus: 'M12 5v14m-7-7h14',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  times: 'M6 18L18 6M6 6l12 12',
  plusCircle: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  arrowDown: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  arrowUp: 'M5 10l7-7m0 0l7 7m-7-7v18',
  alertCircle: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  chevronDown: 'M19 9l-7 7-7-7',
};

// SVG Spinner para loading
const Spinner = ({ className = '' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// SVG Icon wrapper
const SvgIcon = ({ path, className = '' }: { path: string; className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const StockManagement: React.FC = () => {
  const { tenantId } = useAuth();
  // 🐛 FIX: Chamada única do hook — todas as funções vêm da mesma instância
  const { products, logs, loading, error, fetchInventory, addStockEntry, createProduct, updateProduct } = useInventory(tenantId);

  // Estados da UI
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [movementFilter, setMovementFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('PURCHASE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Produto CRUD
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    sku: '',
    category: '',
    unit_price: 0,
    cost_price: 0,
    stock_min: 5,
    stock_max: 9999,
    is_active: true,
    is_exempt: false,
    exemption_reason: ''
  });
  const [uploading, setUploading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Categorias únicas extraídas dos produtos
  const categories = useMemo(() => {
    const unique = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(unique).sort();
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // Logs filtrados por tipo de movimento
  const filteredLogs = useMemo(() => {
    if (movementFilter === 'ALL') return logs;
    return logs.filter(l => l.type === movementFilter);
  }, [logs, movementFilter]);

  // Contadores para dashboard rápido
  const stats = useMemo(() => ({
    total: products.length,
    lowStock: products.filter(p => p.stock_current <= p.stock_min).length,
    outOfStock: products.filter(p => p.stock_current <= 0).length,
    totalValue: products.reduce((acc, p) => acc + (p.stock_current * (p.average_cost || p.cost_price || 0)), 0),
  }), [products]);

  useEffect(() => {
    let scanner: any = null;
    if (isScanning) {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        scanner = new Html5QrcodeScanner("reader-stock", {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        }, false);
        scanner.render((decodedText: string) => {
          const product = products.find(p => p.sku === decodedText);
          if (product) {
            setSelectedProduct(product);
            setIsScanning(false);
            scanner.clear();
          } else {
            setIsScanning(false);
            scanner.clear();
            setProductForm(prev => ({ ...prev, sku: decodedText }));
            setIsProductModalOpen(true);
          }
        }, () => { });
      }).catch(err => {
        console.error("Erro ao carregar scanner:", err);
        alert("Não foi possível aceder à câmara. Verifique as permissões do browser ou utilize a pesquisa manual.");
        setIsScanning(false);
      });
    }
    return () => {
      if (scanner) {
        try {
          scanner.clear();
          const readerElem = document.getElementById("reader-stock");
          if (readerElem) readerElem.innerHTML = "";
        } catch (e) {
          console.warn("Scanner cleanup failed:", e);
        }
      }
    };
  }, [isScanning]);

  const handleAjustment = async () => {
    if (!selectedProduct) return;
    const res = await addStockEntry(selectedProduct.id, quantity, reason);
    if (res?.success) {
      setIsModalOpen(false);
      setQuantity(0);
      setSelectedProduct(null);
    } else {
      alert('Erro: ' + res?.error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    setUploading(true);
    try {
      const { ImageUtils } = await import('../lib/imageUtils');
      const compressed = await ImageUtils.compressImage(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/products/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, compressed);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      setProductForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (savingProduct) return;
    if (!productForm.name) return alert('O nome é obrigatório.');
    setSavingProduct(true);

    let res;
    if (editingProduct) {
      res = await updateProduct(editingProduct.id, productForm);
    } else {
      res = await createProduct(productForm);
    }

    if (res?.success) {
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', sku: '', category: '', unit_price: 0, cost_price: 0, stock_min: 5, stock_max: 9999, is_active: true, is_exempt: false, exemption_reason: '' });
    } else {
      alert('Erro ao guardar: ' + res?.error);
    }
    setSavingProduct(false);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', sku: '', category: '', unit_price: 0, cost_price: 0, stock_min: 5, stock_max: 9999, is_active: true, is_exempt: false, exemption_reason: '' });
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm(p);
    setIsProductModalOpen(true);
  };

  const openStockAdjust = (product?: Product) => {
    setSelectedProduct(product || null);
    setQuantity(0);
    setIsModalOpen(true);
  };

  // 🟢 Loading Skeleton
  if (loading && products.length === 0) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <div className="h-9 w-64 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-5 w-48 bg-slate-100 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-4">
            <div className="h-12 w-36 bg-slate-200 rounded-2xl animate-pulse" />
            <div className="h-12 w-44 bg-indigo-200 rounded-2xl animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="space-y-1 p-6">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-slate-50 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-12 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="h-5 w-20 bg-slate-50 rounded-md animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="h-5 w-40 bg-slate-200 rounded-lg animate-pulse mb-4" />
            <div className="bg-slate-900 rounded-[2rem] p-6 space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex gap-4 items-start border-b border-white/5 pb-4 last:border-0">
                  <div className="w-8 h-8 bg-slate-800 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
                    <div className="h-2 w-24 bg-slate-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestão de Inventário
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              Controlo de entradas, saídas e alertas de rutura.
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => fetchInventory()}
            disabled={loading}
            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
            title="Atualizar dados"
          >
            <Spinner className={`w-4 h-4 ${loading ? 'block' : 'hidden'}`} />
            <SvgIcon path={Icons.refresh} className={`w-4 h-4 ${loading ? 'hidden' : 'block'}`} />
            Atualizar
          </button>
          <button
            onClick={openNewProduct}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <SvgIcon path={Icons.box} className="w-4 h-4" />
            Novo Produto
          </button>
          <button
            onClick={() => openStockAdjust()}
            className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
          >
            <SvgIcon path={Icons.plusCircle} className="w-4 h-4" />
            Entrada de Stock
          </button>
        </div>
      </div>

      {/* ⚠️ Error Banner */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2 duration-300">
          <SvgIcon path={Icons.alertCircle} className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 📊 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Produtos</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Stock Baixo</p>
          <p className={`text-3xl font-black mt-1 ${stats.lowStock > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{stats.lowStock}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rutura</p>
          <p className={`text-3xl font-black mt-1 ${stats.outOfStock > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{stats.outOfStock}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor em Stock</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 truncate">{stats.totalValue.toLocaleString()} <span className="text-sm font-normal text-slate-400">Kz</span></p>
        </div>
      </div>

      {/* 🔍 Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <SvgIcon path={Icons.search} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar produto por nome ou SKU..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {categories.length > 0 && (
          <div className="relative">
            <select
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-4 pr-10 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <SvgIcon path={Icons.chevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}
        {filteredProducts.length > 0 && (
          <div className="flex items-center px-4 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            {filteredProducts.length} de {products.length} resultados
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 📋 Product Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right hidden md:table-cell">Custo</th>
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right hidden md:table-cell">Venda</th>
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hidden sm:table-cell">Mín</th>
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600 shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <SvgIcon path={Icons.box} className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{p.name}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                {p.sku || 'Sem SKU'}
                                {p.category && <span className="ml-2 text-indigo-400">• {p.category}</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-black tabular-nums ${
                            p.stock_current <= 0 ? 'text-rose-500' :
                            p.stock_current <= p.stock_min ? 'text-amber-500' :
                            'text-slate-700 dark:text-slate-200'
                          }`}>
                            {p.stock_current}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right hidden md:table-cell">
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                            {(p.average_cost || p.cost_price || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right hidden md:table-cell">
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {p.unit_price.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center hidden sm:table-cell">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{p.stock_min}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            {p.stock_current <= 0 ? (
                              <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-rose-100 dark:border-rose-800 italic animate-pulse">
                                Rutura
                              </span>
                            ) : p.stock_current <= p.stock_min ? (
                              <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-amber-100 dark:border-amber-800">
                                Baixo
                              </span>
                            ) : (
                              <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-emerald-100 dark:border-emerald-800">
                                Estável
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-all"
                              title="Editar produto"
                            >
                              <SvgIcon path={Icons.edit} className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openStockAdjust(p)}
                              className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all uppercase tracking-wider flex items-center gap-1"
                            >
                              <SvgIcon path={Icons.plusCircle} className="w-3.5 h-3.5" />
                              Ajustar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* 📭 Empty State */
              <div className="text-center py-16 px-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <SvgIcon path={Icons.box} className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  {searchTerm || categoryFilter ? 'Nenhum resultado encontrado' : 'Nenhum produto registado'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">
                  {searchTerm || categoryFilter
                    ? 'Tente ajustar os filtros de pesquisa ou categoria.'
                    : 'Clique em "Novo Produto" para começar a registar o seu inventário.'}
                </p>
                {(searchTerm || categoryFilter) && (
                  <button
                    onClick={() => { setSearchTerm(''); setCategoryFilter(''); }}
                    className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 📜 Movement History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Movimentações</h3>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['ALL', 'IN', 'OUT'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setMovementFilter(filter)}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all ${
                    movementFilter === filter
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {filter === 'ALL' ? 'Tudo' : filter === 'IN' ? 'Entradas' : 'Saídas'}
                </button>
              ))}
            </div>
          </div>

          {filteredLogs.length > 0 ? (
            <div className="bg-slate-900 dark:bg-slate-950 rounded-[2rem] p-6 space-y-4 shadow-xl">
              {filteredLogs.slice(0, 20).map(log => {
                const product = products.find(p => p.id === log.product_id);
                return (
                  <div key={log.id} className="flex gap-4 items-start border-b border-white/5 pb-4 last:border-0 group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      log.type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      <SvgIcon path={log.type === 'IN' ? Icons.arrowDown : Icons.arrowUp} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold leading-tight truncate">
                        {product?.name || 'Produto removido'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {log.type === 'IN' ? '+' : '-'}{log.quantity} • {log.reason}
                      </p>
                    </div>
                    <span className="text-[9px] text-slate-600 font-black shrink-0">
                      {new Date(log.created_at!).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              {filteredLogs.length > 20 && (
                <p className="text-center text-[10px] text-slate-600 font-bold pt-2">
                  +{filteredLogs.length - 20} movimentações anteriores
                </p>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 dark:bg-slate-950 rounded-[2rem] p-10 text-center">
              <p className="text-slate-600 text-xs font-bold">Nenhuma movimentação registada.</p>
            </div>
          )}
        </div>
      </div>

      {/* 📦 Modal: Stock Adjustment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-slate-700">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Registar Movimentação</h3>

            <div className="space-y-4">
              {/* Scanner row */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <SvgIcon path={Icons.search} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-400 dark:text-slate-500"
                    placeholder="Use o Scanner ao lado..."
                    value={selectedProduct?.sku || ''}
                  />
                </div>
                <button
                  onClick={() => setIsScanning(!isScanning)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                    isScanning ? 'bg-rose-500 text-white' : 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg'
                  }`}
                >
                  <SvgIcon path={isScanning ? Icons.times : Icons.camera} className="w-5 h-5" />
                </button>
              </div>

              {isScanning && (
                <div className="rounded-2xl overflow-hidden border-2 border-slate-900 dark:border-slate-600 animate-in zoom-in duration-300">
                  <div id="reader-stock"></div>
                </div>
              )}

              {!selectedProduct && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Selecionar Artigo</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
                  >
                    <option value="">Escolha um produto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''} — Stock: {p.stock_current}</option>)}
                  </select>
                </div>
              )}

              {selectedProduct && (
                <div className="bg-indigo-50 dark:bg-indigo-950/50 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{selectedProduct.name}</p>
                  <p className="text-[10px] text-indigo-500 font-medium">Stock atual: {selectedProduct.stock_current} unidades</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Quantidade (positivo = entrada, negativo = saída)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  placeholder="Ex: 10 ou -5"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Motivo</label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                >
                  <option value="PURCHASE">Compra de Stock (Entrada)</option>
                  <option value="ADJUSTMENT">Ajuste Manual / Inventário</option>
                  <option value="RETURN">Devolução (Entrada)</option>
                  <option value="WASTE">Quebra / Perda (Saída)</option>
                  <option value="SALE">Venda (Saída)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => { setIsModalOpen(false); setSelectedProduct(null); }}
                  className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAjustment}
                  disabled={!selectedProduct || quantity === 0}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📦 Modal: Product Create/Edit */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white/20 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Preencha os dados fundamentais do artigo.</p>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition-colors p-2">
                <SvgIcon path={Icons.times} className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 text-center">
                  Imagem do Produto
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden group">
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <Spinner className="w-8 h-8 text-indigo-600 mb-2" />
                      <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">A comprimir e enviar...</p>
                    </div>
                  ) : productForm.image_url ? (
                    <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-xl">
                      <img src={productForm.image_url} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer text-white font-bold text-xs">Trocar</label>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center">
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <SvgIcon path={Icons.image} className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Clique para carregar</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1">PNG, JPG até 5MB</p>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome do Produto *</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all outline-none"
                  value={productForm.name}
                  onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Coca-Cola 330ml"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">SKU / Código</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all outline-none"
                  value={productForm.sku}
                  onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="EX: REF-001"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all outline-none"
                  value={productForm.category || ''}
                  onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ex: Bebidas, Alimentação, Limpeza"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preço Custo (KZ)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all outline-none font-mono"
                  value={productForm.cost_price}
                  onChange={e => setProductForm(prev => ({ ...prev, cost_price: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preço Venda (KZ) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all outline-none font-mono text-indigo-600 dark:text-indigo-400"
                  value={productForm.unit_price}
                  onChange={e => setProductForm(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Stock Mínimo</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all outline-none"
                  value={productForm.stock_min}
                  onChange={e => setProductForm(prev => ({ ...prev, stock_min: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Stock Máximo</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all outline-none"
                  value={productForm.stock_max}
                  onChange={e => setProductForm(prev => ({ ...prev, stock_max: Number(e.target.value) }))}
                />
              </div>

              <div className="flex flex-col space-y-4 pt-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_exempt"
                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                    checked={productForm.is_exempt}
                    onChange={e => setProductForm(prev => ({ ...prev, is_exempt: e.target.checked }))}
                  />
                  <label htmlFor="is_exempt" className="text-xs font-bold text-slate-700 dark:text-slate-300">Isento de IVA (Conformidade AGT)</label>
                </div>

                {productForm.is_exempt && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Motivo de Isenção (Obrigatório AGT)</label>
                    <select
                      className="w-full bg-rose-50 dark:bg-rose-950/50 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-rose-700 dark:text-rose-300 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900 transition-all outline-none mt-1"
                      value={productForm.exemption_reason}
                      onChange={e => setProductForm(prev => ({ ...prev, exemption_reason: e.target.value }))}
                    >
                      <option value="">Selecione o motivo...</option>
                      <option value="M02">M02 - Isento nos termos da alínea a) do nº1 do Artº 12º do CIVA</option>
                      <option value="M04">M04 - Isento nos termos da alínea c) do nº1 do Artº 12º do CIVA</option>
                      <option value="M20">M20 - IVA - Regime de Exclusão</option>
                      <option value="M30">M30 - IVA - Regime Simplificado</option>
                      <option value="Outro">Outro Motivo (Especificar na descrição)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-[1.5rem] transition-colors uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={savingProduct}
                className="flex-1 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-slate-200 dark:shadow-none hover:bg-black dark:hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingProduct && <Spinner className="w-4 h-4" />}
                {editingProduct ? 'Guardar Alterações' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
