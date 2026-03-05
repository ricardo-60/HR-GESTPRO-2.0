import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const SaleHistory = ({ tenantId }: { tenantId: string }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        if (!tenantId) return;
        fetchInvoices();
    }, [tenantId]);

    const fetchInvoices = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) {
            setInvoices(data);
        }
        setLoading(false);
    };

    const handleCancel = async (id: string) => {
        if (window.confirm("Tem certeza que deseja anular este documento oficial? Esta acção é irreversível.")) {
            await supabase.from('invoices').update({ status: 'cancelled', payment_status: 'cancelled' }).eq('id', id);
            alert("Documento anulado com sucesso.");
            fetchInvoices();
        }
    }

    const filtered = invoices.filter(inv => {
        const matchName = inv.client_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchNo = inv.invoice_no.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || inv.payment_status === filterStatus;
        return (matchName || matchNo) && matchStatus;
    });

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center bg-slate-50 border-b border-slate-100 gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Histórico de Documentos</h3>
                    <p className="text-xs text-slate-500 font-medium">Controle todas as Faturas (FT) e Proformas (PF) emitidas.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Pesquisar Fatura ou Cliente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Todos Pagamentos</option>
                        <option value="paid">Pagos</option>
                        <option value="pending">Pendentes</option>
                        <option value="cancelled">Anulados</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-8 py-5">Nº Documento</th>
                            <th className="px-8 py-5">Cliente</th>
                            <th className="px-8 py-5 text-right">Método</th>
                            <th className="px-8 py-5 text-right">Montante (KZ)</th>
                            <th className="px-8 py-5 text-center">Estado</th>
                            <th className="px-8 py-5 text-center">Data</th>
                            <th className="px-8 py-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading && (
                            <tr>
                                <td colSpan={7} className="text-center py-10 font-bold text-slate-400">
                                    <i className="fas fa-spinner fa-spin mr-2"></i> a carregar documentos...
                                </td>
                            </tr>
                        )}
                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-10 font-bold text-slate-400">
                                    Nenhum documento encontrado na pesquisa.
                                </td>
                            </tr>
                        )}
                        {filtered.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-5 font-black text-slate-900 border-l-4 border-transparent group-hover:border-indigo-500 transition-colors">
                                    {inv.invoice_no}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="font-bold text-slate-700">{inv.client_name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{inv.client_tax_id || 'S/NIF'}</div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center">
                                        {inv.payment_method === 'cash' ? <><i className="fas fa-money-bill-wave mr-1"></i> Pronto</>
                                            : inv.payment_method === 'transfer' ? <><i className="fas fa-exchange-alt mr-1"></i> Transf</>
                                                : inv.payment_method === 'card' ? <><i className="fas fa-credit-card mr-1"></i> TPA</>
                                                    : <><i className="fas fa-calendar mr-1"></i> Prazo</>
                                        }
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right font-black text-slate-800">
                                    {Number(inv.total_amount).toFixed(2)}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    {inv.status === 'cancelled' ? (
                                        <span className="text-rose-500 bg-rose-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">Anulada</span>
                                    ) : inv.payment_status === 'pending' ? (
                                        <span className="text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">Por Pagar</span>
                                    ) : (
                                        <span className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">Pago</span>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-center font-bold text-slate-400 text-xs">
                                    {new Date(inv.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-5 flex items-center justify-end space-x-2">
                                    <button title="Re-Imprimir" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition-colors">
                                        <i className="fas fa-print"></i>
                                    </button>
                                    {inv.status !== 'cancelled' && (
                                        <button onClick={() => handleCancel(inv.id)} title="Anular Fatura" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">
                                            <i className="fas fa-ban"></i>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
