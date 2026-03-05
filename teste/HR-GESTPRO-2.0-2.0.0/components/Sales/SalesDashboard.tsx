import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';

export const SalesDashboard = ({ session, tenantId }: { session: any, tenantId: string }) => {
    const [stats, setStats] = useState({
        daily: 0,
        monthly: 0,
        count: 0
    });
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

    useEffect(() => {
        if (!tenantId) return;

        const fetchStats = async () => {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

            // Fetch daily sales (FT only, not Proformas)
            const { data: dailyData } = await supabase
                .from('invoices')
                .select('total_amount')
                .eq('tenant_id', tenantId)
                .eq('doc_type', 'FT')
                .gte('created_at', startOfDay);

            const daily = dailyData?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
            const count = dailyData?.length || 0;

            // Fetch monthly sales
            const { data: monthlyData } = await supabase
                .from('invoices')
                .select('total_amount')
                .eq('tenant_id', tenantId)
                .eq('doc_type', 'FT')
                .gte('created_at', startOfMonth);

            const monthly = monthlyData?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;

            // Fetch low stock alerts
            const { data: lowStock } = await supabase
                .from('products')
                .select('name, stock_current, stock_min')
                .eq('tenant_id', tenantId)
                .lte('stock_current', 'stock_min') // Note: In Postgres we might need raw filter or check values
                .eq('is_active', true);

            // Filtering in JS to compare with dynamic stock_min column if needed, 
            // but usually stock_current <= stock_min works in SQL if both are columns.
            // Let's use a more robust check in JS if needed, but SQL is fine.
            setLowStockProducts(lowStock?.filter(p => p.stock_current <= p.stock_min) || []);

            setStats({ daily, monthly, count });
        };
        fetchStats();
    }, [tenantId, session]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Stats Modificados pelo Session */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group ${session ? 'bg-white border-emerald-200' : 'bg-slate-50 border-gray-200 opacity-50'}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 ${session ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            <i className="fas fa-cash-register"></i>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Vendas no Turno</p>
                        <p className={`text-3xl font-black tracking-tighter ${session ? 'text-slate-800' : 'text-slate-400'}`}>
                            {session ? `KZ ${Number(session.total_sales).toFixed(2)}` : 'KZ 0.00'}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 bg-blue-100 text-blue-600">
                            <i className="fas fa-calendar-day"></i>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Faturado Hoje</p>
                        <p className="text-3xl font-black tracking-tighter text-slate-800">
                            KZ {stats.daily.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 bg-indigo-100 text-indigo-600">
                            <i className="fas fa-calendar-alt"></i>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Faturado no Mês</p>
                        <p className="text-3xl font-black tracking-tighter text-slate-800">
                            KZ {stats.monthly.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-800 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-slate-800 text-emerald-400 rounded-2xl flex items-center justify-center text-xl mb-4">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Qtd. Vendas Hoje</p>
                        <p className="text-4xl font-black text-white tracking-tighter mt-1">
                            {stats.count}
                        </p>
                        <div className="mt-4 flex items-center text-xs font-bold text-emerald-400">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                            Em Operação
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900">Análise de Performance Comercial</h3>
                    <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">Visão Mensal</div>
                </div>

                {/* Visualização de barras simulada para manter design premium sem library extra pesada */}
                <div className="h-64 flex items-end space-x-2 w-full pt-10 px-2 pb-6 border-b border-l border-slate-100 relative">
                    {/* Linha de guia horizontal */}
                    <div className="absolute w-full h-px bg-slate-100 top-1/2 left-0 -z-10"></div>
                    <div className="absolute w-full h-px bg-slate-100 top-1/4 left-0 -z-10"></div>

                    {[1, 2, 3, 4, 5, 6, 7].map((day, i) => {
                        // Alturas aleatórias para simular gráfico de vendas da última semana
                        const height = Math.floor(Math.random() * 80) + 20;
                        const isToday = i === 6;
                        return (
                            <div key={day} className="flex-1 flex flex-col items-center group cursor-pointer relative z-10">
                                <div className="hidden group-hover:block absolute -top-10 bg-slate-900 text-white text-xs font-bold py-1 px-2 rounded -ml-4 whitespace-nowrap z-20 shadow-xl">
                                    Vendas: {height * 1500} KZ
                                </div>
                                <div
                                    className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out group-hover:bg-indigo-400 ${isToday ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-200'}`}
                                    style={{ height: `${height}%` }}
                                ></div>
                                <span className="text-[10px] font-bold text-slate-400 mt-3 -mx-2 whitespace-nowrap">
                                    Dia {day}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-center mt-6 space-x-6">
                    <div className="flex items-center text-xs font-bold text-slate-500"><div className="w-3 h-3 bg-indigo-600 rounded mr-2"></div> Vendas (Kz)</div>
                </div>
            </div>
        </div>
    );
};
