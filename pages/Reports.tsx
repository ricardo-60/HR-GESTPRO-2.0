import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

const Reports: React.FC = () => {
    const { tenantId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [stats, setStats] = useState({
        totalSales: 0,
        totalVat: 0,
        grossProfit: 0,
        invoicesCount: 0
    });

    const [topProducts, setTopProducts] = useState<any[]>([]);

    const fetchReports = async () => {
        if (!tenantId || !supabase) return;
        setLoading(true);
        try {
            // 1. Fetch Invoices for Finance
            const { data: invoices } = await supabase
                .from('invoices')
                .select('total_amount, tax_amount, subtotal')
                .eq('tenant_id', tenantId)
                .eq('doc_type', 'FT')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end + 'T23:59:59');

            const totalSales = invoices?.reduce((acc, i) => acc + Number(i.total_amount), 0) || 0;
            const totalVat = invoices?.reduce((acc, i) => acc + Number(i.tax_amount), 0) || 0;

            // 1.1 Calculation of real Profit based on PMP
            // Fetch items with their cost at the time (or product average_cost)
            const { data: saleItems } = await supabase
                .from('invoice_items')
                .select('quantity, unit_price, product_id, products(average_cost)')
                .in('invoice_id', invoices?.map(i => (i as any).id) || []);

            const totalCost = saleItems?.reduce((acc, item) => {
                const cost = (item as any).products?.average_cost || 0;
                return acc + (item.quantity * cost);
            }, 0) || 0;

            const grossProfit = (totalSales - totalVat) - totalCost;

            setStats({
                totalSales,
                totalVat,
                grossProfit,
                invoicesCount: invoices?.length || 0
            });

            // 2. Fetch Top Products (Ranking)
            const { data: items } = await supabase
                .from('invoice_items')
                .select('product_name, quantity, total')
                .gte('id', '00000000-0000-0000-0000-000000000000') // Placeholder for join logic
                // In a real app we would use an RPC or more complex query for grouping
                .limit(10); // Simplified for MVP

            setTopProducts(items || []);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [tenantId, dateRange]);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Relatórios de BI</h2>
                    <p className="text-slate-500 font-medium">Análise financeira e operacional do negócio.</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                        className="bg-transparent border-0 text-xs font-black text-slate-600 focus:ring-0"
                    />
                    <span className="text-slate-300 font-bold">até</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                        className="bg-transparent border-0 text-xs font-black text-slate-600 focus:ring-0"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Faturação Total</p>
                    <p className="text-2xl font-black">KZ {stats.totalSales.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IVA Cobrado (14%)</p>
                    <p className="text-2xl font-black text-slate-900">KZ {stats.totalVat.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lucro Bruto Est.</p>
                    <p className="text-2xl font-black text-emerald-600">KZ {stats.grossProfit.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Documentos</p>
                    <p className="text-2xl font-black text-slate-900">{stats.invoicesCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <i className="fas fa-trophy text-amber-500"></i> Ranking de Artigos
                    </h3>
                    <div className="space-y-4">
                        {topProducts.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                <span className="text-sm font-bold text-slate-700">{p.product_name}</span>
                                <span className="text-xs font-black text-slate-400">{p.quantity} Unid.</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <h3 className="text-lg font-black mb-6 relative z-10">Exportação Contabilística</h3>
                    <p className="text-indigo-100 text-sm mb-8 relative z-10 leading-relaxed">
                        Gere ficheiros compatíveis com o regime fiscal de Angola para auditoria ou contabilidade externa.
                    </p>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <button className="bg-white text-indigo-600 font-black py-4 rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                            <i className="fas fa-file-pdf"></i> PDF
                        </button>
                        <button className="bg-indigo-500 text-white font-black py-4 rounded-2xl border border-indigo-400 hover:bg-indigo-400 transition-all flex items-center justify-center gap-2">
                            <i className="fas fa-file-csv"></i> CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
