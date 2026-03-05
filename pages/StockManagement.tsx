import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useInventory } from '../hooks/useInventory';
import { Product } from '../types';

const StockManagement: React.FC = () => {
    const { tenantId } = useAuth();
    const { products, logs, loading, addStockEntry, fetchInventory } = useInventory(tenantId);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(0);
    const [reason, setReason] = useState('PURCHASE');
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Inventário</h2>
                    <p className="text-slate-500 font-medium">Controlo de entradas, saídas e alertas de rutura.</p>
                </div>
                <button
                    onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                    <i className="fas fa-plus"></i> Entrada de Stock
                </button>
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
                                            <p className="font-bold text-slate-900">{p.name}</p>
                                            <p className="text-xs text-slate-400 font-medium">{p.sku || 'Sem SKU'}</p>
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
                                        <td className="px-6 py-5 text-right">
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
                        <h3 className="text-xl font-black text-slate-900 mb-6">Registar Movimentação</h3>

                        <div className="space-y-4">
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
        </div>
    );
};

export default StockManagement;
