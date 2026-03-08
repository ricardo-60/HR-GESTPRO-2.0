import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { SalesDashboard } from '../components/Sales/SalesDashboard';
import { SaleHistory } from '../components/Sales/SaleHistory';
import { PosTerminal } from '../components/Sales/PosTerminal';

interface PosSession {
    id: string;
    opening_balance: number;
    total_sales: number;
    invoices_count: number;
    status: string;
}

const SalesManagement: React.FC = () => {
    const { tenantStatus, tenantId, user, profile } = useAuth();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
    const [isPosOpen, setIsPosOpen] = useState(false);

    // POS Tracking
    const [session, setSession] = useState<PosSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [showOpenBox, setShowOpenBox] = useState(false);
    const [showCloseBox, setShowCloseBox] = useState(false);

    // Box Open/Close State
    const [openingBalance, setOpeningBalance] = useState<number>(0);
    const [actualBalance, setActualBalance] = useState<number>(0);

    const fetchSession = async () => {
        if (!supabase || !user) return;
        setLoadingSession(true);
        const { data, error } = await supabase
            .from('pos_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'open')
            .maybeSingle();

        if (data && !error) {
            setSession(data);
        } else {
            setSession(null);
        }
        setLoadingSession(false);
    };

    useEffect(() => {
        fetchSession();
    }, [user]);

    const handleOpenBox = async () => {
        if (!supabase || !tenantId || !user) return;

        // Block if user cannot close sales (which implicitly means "manage a till")
        if (!profile?.can_close_sales && profile?.role !== 'master_admin') {
            alert('Acesso negado: Não tem permissões para operar o Caixa.');
            return;
        }

        const { data, error } = await supabase.from('pos_sessions').insert([{
            tenant_id: tenantId,
            user_id: user.id,
            opening_balance: openingBalance,
            total_sales: 0,
            invoices_count: 0,
            status: 'open'
        }]).select().single();

        if (error) {
            alert('Erro ao abrir caixa: ' + error.message);
        } else {
            setSession(data);
            setShowOpenBox(false);
        }
    };

    const handleCloseBox = async () => {
        if (!supabase || !session) return;
        const expected = Number(session.opening_balance) + Number(session.total_sales);
        const diff = Number(actualBalance) - expected;

        const { error } = await supabase.from('pos_sessions').update({
            closed_at: new Date().toISOString(),
            expected_closing_balance: expected,
            actual_closing_balance: actualBalance,
            difference: diff,
            status: 'closed',
            closed_by: user?.id
        }).eq('id', session.id);

        if (error) {
            alert('Erro ao fechar caixa: ' + error.message);
        } else {
            alert(`Caixa Fechado com Sucesso. Diferença: ${diff.toFixed(2)} KZ`);
            setSession(null);
            setShowCloseBox(false);
        }
    };

    if (profile?.role !== 'master_admin' && profile?.role !== 'tenant_admin' && profile?.role !== 'sales_user') {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner border border-rose-100">
                    <i className="fas fa-lock"></i>
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Acesso Interdito</h2>
                <p className="text-slate-500 mt-2 font-medium">Não tem o perfil adequado (Vendas) para aceder a esta área.</p>
            </div>
        );
    }

    if (!tenantId || !profile) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
                    <i className="fas fa-shopping-cart"></i>
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Preparando Terminal de Vendas...</h2>
                <p className="text-slate-400 mt-2 font-medium uppercase text-[10px] tracking-widest">Sincronizando Sessão Comercial</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">

            {/* Main Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2 flex items-center">
                        Zona de Vendas
                        <span className="ml-4 text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100">
                            Versão 2.0 Modern
                        </span>
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Gestão Comercial e Inventário da entidade: <span className="text-indigo-600 font-bold">{tenantStatus?.company_name || 'Organização'}</span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {loadingSession ? (
                        <div className="text-xs text-slate-400 font-bold py-3 pr-4 animate-pulse">A comunicar com Banco de Dados...</div>
                    ) : session ? (
                        <>
                            <button
                                onClick={() => setShowCloseBox(true)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all focus:ring-4 focus:ring-rose-100 flex items-center space-x-2"
                            >
                                <i className="fas fa-lock"></i>
                                <span>Fechar Turno</span>
                            </button>
                            <button
                                onClick={() => setIsPosOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 transition-all focus:ring-4 focus:ring-indigo-100 flex items-center space-x-3 group"
                            >
                                <i className="fas fa-desktop group-hover:scale-110 transition-transform"></i>
                                <span>Ponto de Venda / Emitir Fatura</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setShowOpenBox(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 transition-all focus:ring-4 focus:ring-emerald-100 flex items-center space-x-3 group"
                        >
                            <i className="fas fa-cash-register group-hover:scale-110 transition-transform"></i>
                            <span>Abrir Caixa para Iniciar Vendas</span>
                        </button>
                    )}
                </div>
            </div>

            {/* TAB Navigation */}
            <div className="flex border-b border-slate-200 space-x-8">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`pb-4 px-2 text-sm font-black tracking-widest uppercase transition-all border-b-4 ${activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                >
                    <i className="fas fa-chart-pie mr-2"></i> Dashboard e Desempenho
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 px-2 text-sm font-black tracking-widest uppercase transition-all border-b-4 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                >
                    <i className="fas fa-history mr-2"></i> Documentos Emitidos
                </button>
            </div>

            {/* Tab Views */}
            <div className="pt-2">
                {activeTab === 'dashboard' && (
                    <SalesDashboard session={session} tenantId={tenantId || ''} />
                )}

                {activeTab === 'history' && (
                    <SaleHistory tenantId={tenantId || ''} />
                )}
            </div>

            {/* POS Terminal Modal */}
            {isPosOpen && session && (
                <PosTerminal
                    session={session}
                    tenantId={tenantId || ''}
                    user={user}
                    tenantStatus={tenantStatus}
                    onUpdateSession={fetchSession}
                    onClose={() => setIsPosOpen(false)}
                />
            )}

            {/* Modal Abrir Caixa */}
            {showOpenBox && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-8 text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">
                            <i className="fas fa-cash-register"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Abrir Caixa</h3>
                        <p className="text-slate-500 text-sm mb-8">Insira o saldo inicial na gaveta para iniciar o turno de vendas.</p>

                        <div className="text-left mb-8">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Fundo de Maneio (KZ)</label>
                            <input
                                type="number"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-slate-900 text-2xl"
                                value={openingBalance}
                                onChange={e => setOpeningBalance(Number(e.target.value))}
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button onClick={() => setShowOpenBox(false)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors w-full border border-slate-200">
                                Cancelar
                            </button>
                            <button onClick={handleOpenBox} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl font-black transition-colors shadow-lg shadow-emerald-600/30 w-full">
                                Iniciar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Fechar Caixa */}
            {showCloseBox && session && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col p-8 text-center">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">
                            <i className="fas fa-lock"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Encerrar Turno</h3>
                        <p className="text-slate-500 text-sm mb-6">Fecho cego de sessão. Confirme os valores em caixa.</p>

                        <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100 shadow-inner">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 font-bold text-sm">Fundo Inicial</span>
                                <span className="text-slate-900 font-black">KZ {Number(session.opening_balance).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-4">
                                <span className="text-slate-500 font-bold text-sm">Vendas Registadas</span>
                                <span className="text-emerald-600 font-black">+ KZ {Number(session.total_sales).toFixed(2)}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Sistémico</span>
                                <span className="text-xl font-black text-slate-900 tracking-tight">KZ {(Number(session.opening_balance) + Number(session.total_sales)).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="text-left mb-8">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Contado (Real)</label>
                            <input
                                type="number"
                                className="w-full px-5 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none font-black text-indigo-900 text-2xl"
                                value={actualBalance}
                                onChange={e => setActualBalance(Number(e.target.value))}
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button onClick={() => setShowCloseBox(false)} className="px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors w-full border border-slate-200">
                                Voltar
                            </button>
                            <button onClick={handleCloseBox} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-4 rounded-2xl font-black transition-colors shadow-lg shadow-rose-600/30 w-full">
                                Confirmar Fecho
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesManagement;
