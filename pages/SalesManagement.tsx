import React from 'react';
import { useAuth } from '../AuthContext';

const SalesManagement: React.FC = () => {
    const { tenantStatus } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Painel de Vendas</h2>
                    <p className="text-slate-500 font-medium">
                        Gestão Comercial da entidade: <span className="text-indigo-600 font-bold">{tenantStatus?.company_name || 'Organização'}</span>
                    </p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all flex items-center space-x-2 self-start sm:self-auto">
                    <i className="fas fa-plus"></i>
                    <span>Nova Venda</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                            <i className="fas fa-euro-sign"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Vendas Hoje</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">€ 2.450,00</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                            <i className="fas fa-users"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Novos Clientes</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">14</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                            <i className="fas fa-box-open"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Produtos Faturados</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">89</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/20 overflow-hidden mt-8">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Últimas Vendas</h3>
                    <button className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-700">Ver Todas</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                            <tr>
                                <th className="px-8 py-5"># Fatura</th>
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5">Data</th>
                                <th className="px-8 py-5">Valor</th>
                                <th className="px-8 py-5">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-8 py-5 font-mono text-xs text-slate-500">FT-2023/1042</td>
                                <td className="px-8 py-5 font-bold text-slate-700">Tech Solutions Lda.</td>
                                <td className="px-8 py-5 text-slate-500 text-xs">Hoje, 14:30</td>
                                <td className="px-8 py-5 font-bold text-slate-800">€ 1.250,00</td>
                                <td className="px-8 py-5">
                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pago</span>
                                </td>
                            </tr>
                            <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-8 py-5 font-mono text-xs text-slate-500">FT-2023/1041</td>
                                <td className="px-8 py-5 font-bold text-slate-700">Restaurante O Mar</td>
                                <td className="px-8 py-5 text-slate-500 text-xs">Hoje, 11:15</td>
                                <td className="px-8 py-5 font-bold text-slate-800">€ 320,50</td>
                                <td className="px-8 py-5">
                                    <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pendente</span>
                                </td>
                            </tr>
                            <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-8 py-5 font-mono text-xs text-slate-500">FT-2023/1040</td>
                                <td className="px-8 py-5 font-bold text-slate-700">Dna. Maria Silva</td>
                                <td className="px-8 py-5 text-slate-500 text-xs">Ontem, 16:45</td>
                                <td className="px-8 py-5 font-bold text-slate-800">€ 85,00</td>
                                <td className="px-8 py-5">
                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pago</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesManagement;
