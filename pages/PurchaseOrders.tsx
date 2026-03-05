import React, { useState, useEffect } from 'react';
import { usePurchases } from '../hooks/usePurchases';
import { useSuppliers } from '../hooks/useSuppliers';
import { supabase } from '../lib/supabase';
import { Product, Supplier } from '../types';
import {
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    Check,
    X,
    AlertCircle,
    Package,
    FileText,
    Building2,
    Calendar,
    ChevronRight,
    TrendingUp,
    Clock,
    CheckCircle2
} from 'lucide-react';

interface CartItem {
    product: Product;
    quantity: number;
    costPrice: number;
}

export default function PurchaseOrders() {
    const { orders, loading, error, createPurchase, finalizePurchase } = usePurchases();
    const { suppliers } = useSuppliers();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dbProducts, setDbProducts] = useState<Product[]>([]);

    // Create Order State
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [orderNo, setOrderNo] = useState('');
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        const { data } = await supabase.from('products').select('*').eq('is_active', true);
        setDbProducts(data || []);
    }

    const addToCart = (product: Product) => {
        const existing = cartItems.find(item => item.product.id === product.id);
        if (existing) {
            setCartItems(cartItems.map(item =>
                item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCartItems([...cartItems, { product, quantity: 1, costPrice: product.cost_price || 0 }]);
        }
    };

    const removeFromCart = (productId: string) => {
        setCartItems(cartItems.filter(item => item.product.id !== productId));
    };

    const updateCartItem = (productId: string, field: 'quantity' | 'costPrice', value: number) => {
        setCartItems(cartItems.map(item =>
            item.product.id === productId ? { ...item, [field]: value } : item
        ));
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!selectedSupplier) return setFormError('Seleciona um fornecedor.');
        if (!orderNo) return setFormError('Insere o número da fatura.');
        if (cartItems.length === 0) return setFormError('O carrinho está vazio.');

        try {
            await createPurchase(
                selectedSupplier,
                orderNo,
                cartItems.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    costPrice: item.costPrice
                }))
            );
            setIsModalOpen(false);
            setCartItems([]);
            setOrderNo('');
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    const totalCart = cartItems.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-indigo-600" />
                        Compras e Notas de Entrada
                    </h1>
                    <p className="text-slate-500 mt-1">Regista a entrada de mercadoria e atualiza o teu Preço Médio.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-200"
                >
                    <Plus className="w-5 h-5" />
                    Nova Nota de Entrada
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Orders List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse"></div>
                    ))
                ) : orders.length > 0 ? (
                    orders.map(order => (
                        <div
                            key={order.id}
                            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${order.status === 'finalized' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {order.status === 'finalized' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">Nº {order.order_no}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${order.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {order.status === 'finalized' ? 'Finalizada' : 'Rascunho'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 text-sm mt-0.5">
                                        <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {(order as any).suppliers?.name}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {order.purchase_date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-8">
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-tight">Total da Nota</p>
                                    <p className="text-lg font-black text-slate-900">{order.total_amount.toLocaleString()} Kz</p>
                                </div>

                                {order.status === 'draft' && (
                                    <button
                                        onClick={() => finalizePurchase(order.id)}
                                        className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        Finalizar Entrada
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-slate-900 font-bold text-lg">Sem compras registadas</h3>
                        <p className="text-slate-500">Clica em "Nova Nota de Entrada" para começar.</p>
                    </div>
                )}
            </div>

            {/* Modern Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>

                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[90vh] relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <ShoppingCart className="w-7 h-7 text-indigo-600" />
                                    Nova Nota de Entrada
                                </h2>
                                <p className="text-slate-500 font-medium">Preenche os dados da fatura do fornecedor.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="bg-white p-2.5 rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200 transition-all hover:rotate-90">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left: Form & Selection */}
                            <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Fornecedor</label>
                                        <select
                                            className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none bg-white cursor-pointer hover:border-indigo-300"
                                            value={selectedSupplier}
                                            onChange={(e) => setSelectedSupplier(e.target.value)}
                                        >
                                            <option value="">Selecionar Fornecedor...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Nº Fatura / Nota</label>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all hover:border-indigo-300"
                                            placeholder="Ex: FT-2026/001"
                                            value={orderNo}
                                            onChange={(e) => setOrderNo(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Selecionar Artigos</h3>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Procurar produto por nome ou SKU..."
                                            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {dbProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => addToCart(product)}
                                                className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left group"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800">{product.name}</p>
                                                    <p className="text-xs text-slate-500 italic">Preço Médio Atual: {product.average_cost?.toLocaleString() || product.cost_price?.toLocaleString()} Kz</p>
                                                </div>
                                                <Plus className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Cart Summary */}
                            <div className="w-full md:w-[400px] bg-slate-50/80 p-8 flex flex-col relative">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                                        Itens Digitados
                                    </h3>
                                    <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-full">{cartItems.length}</span>
                                </div>

                                <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                    {cartItems.map((item, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/50 space-y-3 relative group">
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <p className="font-bold text-slate-900 line-clamp-1 pr-6">{item.product.name}</p>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Qtd Comprada</label>
                                                    <input
                                                        type="number"
                                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={item.quantity}
                                                        onChange={(e) => updateCartItem(item.product.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Preço Custo (Un)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={item.costPrice}
                                                        onChange={(e) => updateCartItem(item.product.id, 'costPrice', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-right text-xs font-bold text-slate-400 italic">Subtotal: {(item.quantity * item.costPrice).toLocaleString()} Kz</p>
                                        </div>
                                    ))}

                                    {cartItems.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                                            <Package className="w-12 h-12 mb-2" />
                                            <p className="text-sm font-bold">Carrinho Vazio</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    {formError && (
                                        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            {formError}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Compra</span>
                                        <span className="text-3xl font-black text-slate-900">{totalCart.toLocaleString()} <span className="text-sm font-normal text-slate-400 italic">Kz</span></span>
                                    </div>

                                    <button
                                        onClick={handleCreateOrder}
                                        className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                    >
                                        <Check className="w-6 h-6 border-2 border-white/20 rounded-full" />
                                        Gravar Nota (Rascunho)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
