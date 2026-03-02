import React from 'react';
import { useAuth } from '../AuthContext';

const HRManagement: React.FC = () => {
    const { tenantStatus } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Recursos Humanos</h2>
                    <p className="text-slate-500 font-medium">
                        Gestão de equipas: <span className="text-indigo-600 font-bold">{tenantStatus?.company_name || 'Organização'}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white hover:bg-gray-50 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-200 transition-all flex items-center space-x-2">
                        <i className="fas fa-file-export"></i>
                        <span>Exportar</span>
                    </button>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all flex items-center space-x-2">
                        <i className="fas fa-user-plus"></i>
                        <span>Adicionar Colaborador</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                                <i className="fas fa-users"></i>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Total Colaboradores</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">42</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                                <i className="fas fa-user-check"></i>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Presentes Hoje</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-black text-slate-800 tracking-tighter">38</p>
                                <span className="text-xs font-bold text-slate-400">/ 42</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div className="relative">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-xl mb-4">
                                <i className="fas fa-umbrella-beach"></i>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Em Férias</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tighter">4</p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-1 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-300">
                                <i className="fas fa-calendar-check"></i>
                            </div>
                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">Live</span>
                        </div>
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mb-2">Pedidos Pendentes</p>
                        <p className="text-4xl font-black tracking-tighter mb-6">12</p>
                        <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors backdrop-blur-sm">
                            Rever Pedidos
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/20 overflow-hidden mt-8">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Diretório de Colaboradores</h3>
                    <div className="relative">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" placeholder="Procurar nome ou cargo..." className="pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                            <tr>
                                <th className="px-8 py-5">Colaborador</th>
                                <th className="px-8 py-5">Departamento</th>
                                <th className="px-8 py-5">Cargo</th>
                                <th className="px-8 py-5">Estado</th>
                                <th className="px-8 py-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-8 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">AS</div>
                                        <div>
                                            <p className="font-bold text-slate-800">Ana Silva</p>
                                            <p className="text-xs text-slate-400 font-medium">ana.silva@empresa.pt</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-slate-600 font-medium">Marketing</td>
                                <td className="px-8 py-5 text-slate-600">Diretora de Marketing</td>
                                <td className="px-8 py-5">
                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center inline-flex w-max">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Ativo
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button className="text-slate-400 hover:text-indigo-600 transition-colors p-2"><i className="fas fa-ellipsis-v"></i></button>
                                </td>
                            </tr>
                            <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-8 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">JP</div>
                                        <div>
                                            <p className="font-bold text-slate-800">João Pereira</p>
                                            <p className="text-xs text-slate-400 font-medium">joao.pereira@empresa.pt</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-slate-600 font-medium">IT</td>
                                <td className="px-8 py-5 text-slate-600">Desenvolvedor Frontend</td>
                                <td className="px-8 py-5">
                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center inline-flex w-max">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Ativo
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button className="text-slate-400 hover:text-indigo-600 transition-colors p-2"><i className="fas fa-ellipsis-v"></i></button>
                                </td>
                            </tr>
                            <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td className="px-8 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">MC</div>
                                        <div>
                                            <p className="font-bold text-slate-800">Maria Costa</p>
                                            <p className="text-xs text-slate-400 font-medium">maria.costa@empresa.pt</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-slate-600 font-medium">Vendas</td>
                                <td className="px-8 py-5 text-slate-600">Gestora de Conta</td>
                                <td className="px-8 py-5">
                                    <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center inline-flex w-max">
                                        <i className="fas fa-umbrella-beach mr-2 text-[10px]"></i> Férias
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button className="text-slate-400 hover:text-indigo-600 transition-colors p-2"><i className="fas fa-ellipsis-v"></i></button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HRManagement;
