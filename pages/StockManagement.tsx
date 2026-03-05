import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useInventory } from '../hooks/useInventory';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

const StockManagement: React.FC = () => {
    const { tenantId } = useAuth();
    const { products, logs, loading, addStockEntry, fetchInventory } = useInventory(tenantId);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(0);
    const [reason, setReason] = useState('PURCHASE');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Produto CRUD
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productForm, setProductForm] = useState<Partial<Product>>({
        name: '',
        sku: '',
        unit_price: 0,
        cost_price: 0,
        stock_min: 5,
        is_active: true,
        is_exempt: false
    });
    const [uploading, setUploading] = useState(false);

    const { createProduct, updateProduct } = useInventory(tenantId);

    const [isScanning, setIsScanning] = useState(false);

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
                        // Se não encontrar, tenta carregar o formulário com esse SKU
                        setIsScanning(false);
                        scanner.clear();
                        setProductForm(prev => ({ ...prev, sku: decodedText }));
                        setIsProductModalOpen(true);
                    }
                }, (error: any) => {
                    // Fallback silencioso para erros de frame
                });
            }).catch(err => {
                console.error("Erro ao carregar scanner:", err);
                alert("Não foi possível aceder à câmara. Verifique as permissões do browser ou utilize a pesquisa manual de artigos.");
                setIsScanning(false);
            });
        }
        return () => {
            if (scanner) {
                try { scanner.clear(); } catch (e) { }
            }
        };
    }, [isScanning, products]);

    const handleAjustment = async () => {
        if (!selectedProduct) return;
        const res = await addStockEntry(selectedProduct.id, quantity, reason);
        if (res?.success) {
            alert('Stock atualizado com sucesso!');
            setIsModalOpen(false);
            setQuantity(0);
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

            const { data, error: uploadError } = await supabase.storage
                .from('products') // Novo bucket dedicado
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
        if (!productForm.name) return alert('O nome é obrigatório.');

        let res;
        if (editingProduct) {
            res = await updateProduct(editingProduct.id, productForm);
        } else {
            res = await createProduct(productForm);
        }

        if (res?.success) {
            setIsProductModalOpen(false);
            setEditingProduct(null);
            setProductForm({ name: '', sku: '', unit_price: 0, cost_price: 0, stock_min: 5, is_active: true, is_exempt: false });
        } else {
            alert('Erro ao guardar: ' + res?.error);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Inventário</h2>
                    <p className="text-slate-500 font-medium">Controlo de entradas, saídas e alertas de rutura.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setProductForm({ name: '', sku: '', unit_price: 0, cost_price: 0, stock_min: 5, is_active: true, is_exempt: false });
                            setIsProductModalOpen(true);
                        }}
                        className="bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-boxes"></i> Novo Produto
                    </button>
                    <button
                        onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-plus"></i> Entrada de Stock
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lista de Produtos e Stock */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock Atual</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <i className="fas fa-box text-slate-300"></i>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{p.name}</p>
                                                    <p className="text-xs text-slate-400 font-medium">{p.sku || 'Sem SKU'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-sm font-black ${p.stock_current <= p.stock_min ? 'text-rose-500' : 'text-slate-700'}`}>
                                                {p.stock_current}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                {p.stock_current <= p.stock_min ? (
                                                    <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-rose-100 italic animate-pulse">
                                                        Rutura / Baixo
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-emerald-100">
                                                        Estável
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => {
                                                    setEditingProduct(p);
                                                    setProductForm(p);
                                                    setIsProductModalOpen(true);
                                                }}
                                                className="text-slate-400 hover:text-indigo-600 text-xs font-bold transition-colors"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => { setSelectedProduct(p); setIsModalOpen(true); }}
                                                className="text-indigo-600 font-bold text-xs hover:underline"
                                            >
                                                Ajustar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Histórico de Movimentações */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Últimas Movimentações</h3>
                    <div className="bg-slate-900 rounded-[2rem] p-6 space-y-4 shadow-xl">
                        {logs.map(log => (
                            <div key={log.id} className="flex gap-4 items-start border-b border-white/5 pb-4 last:border-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${log.type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    <i className={`fas fa-arrow-${log.type === 'IN' ? 'down' : 'up'}`}></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-xs font-bold leading-tight">
                                        {products.find(p => p.id === log.product_id)?.name || 'Produto'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                                        {log.type === 'IN' ? '+' : '-'}{log.quantity} • {log.reason}
                                    </p>
                                </div>
                                <span className="text-[9px] text-slate-600 font-black">
                                    {new Date(log.created_at!).toLocaleDateString('pt-PT')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal Entrada/Ajuste */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20">
                        <h3 className="text-xl font-black text-slate-900 mb-6 font-display">Registar Movimentação</h3>

                        <div className="space-y-4">
                            {/* Linha do Scanner para seleção rápida */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <i className="fas fa-barcode absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-400"
                                        placeholder="Use o Scanner ao lado..."
                                        value={selectedProduct?.sku || ''}
                                    />
                                </div>
                                <button
                                    onClick={() => setIsScanning(!isScanning)}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isScanning ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white shadow-lg'}`}
                                >
                                    <i className={`fas ${isScanning ? 'fa-times' : 'fa-camera'}`}></i>
                                </button>
                            </div>

                            {isScanning && (
                                <div className="rounded-2xl overflow-hidden border-2 border-slate-900 animate-in zoom-in duration-300">
                                    <div id="reader-stock"></div>
                                </div>
                            )}
                            {!selectedProduct && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Selecionar Artigo</label>
                                    <select
                                        className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                        onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
                                    >
                                        <option value="">Escolha um produto...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantidade (Use negativo para saída)</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                    value={quantity}
                                    onChange={e => setQuantity(Number(e.target.value))}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo</label>
                                <select
                                    className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                >
                                    <option value="PURCHASE">Compra de Stock (Entrada)</option>
                                    <option value="ADJUSTMENT">Ajuste Manual / Inventário</option>
                                    <option value="RETURN">Devolução</option>
                                    <option value="WASTE">Quebra / Perda (Saída)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
                                <button onClick={handleAjustment} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cadastro/Edição de Produto */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white/20 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                                </h3>
                                <p className="text-slate-500 font-medium text-sm">Preencha os dados fundamentais do artigo.</p>
                            </div>
                            <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Upload de Imagem Otimizada */}
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Imagem do Produto (Otimização Automática)</label>
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] p-8 hover:border-indigo-300 transition-colors bg-slate-50/50 relative overflow-hidden group">
                                    {uploading ? (
                                        <div className="flex flex-col items-center">
                                            <i className="fas fa-circle-notch fa-spin text-indigo-600 text-2xl mb-2"></i>
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
                                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 text-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                                <i className="fas fa-image"></i>
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">Clique para carregar</p>
                                            <p className="text-[9px] text-slate-400 font-medium mt-1">PNG, JPG até 5MB</p>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    value={productForm.name}
                                    onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Coca-Cola 330ml"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Código</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    value={productForm.sku}
                                    onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                                    placeholder="EX: REF-001"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Custo (KZ)</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-mono"
                                    value={productForm.cost_price}
                                    onChange={e => setProductForm(prev => ({ ...prev, cost_price: Number(e.target.value) }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Venda (KZ)</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-mono text-indigo-600"
                                    value={productForm.unit_price}
                                    onChange={e => setProductForm(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Mínimo</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    value={productForm.stock_min}
                                    onChange={e => setProductForm(prev => ({ ...prev, stock_min: Number(e.target.value) }))}
                                />
                            </div>

                            <div className="flex items-center space-x-4 pt-6">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_exempt"
                                        className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                                        checked={productForm.is_exempt}
                                        onChange={e => setProductForm(prev => ({ ...prev, is_exempt: e.target.checked }))}
                                    />
                                    <label htmlFor="is_exempt" className="ml-2 text-xs font-bold text-slate-700">Isento de IVA</label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-[1.5rem] transition-colors uppercase text-xs tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveProduct}
                                className="flex-1 py-4 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-xl shadow-slate-200 hover:bg-black transition-all uppercase text-xs tracking-widest"
                            >
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
