import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PaymentWithTenant {
    id: string;
    tenant_id: string;
    amount: number;
    currency: string;
    status: string;
    proof_url: string;
    created_at: string;
    tenants: {
        company_name: string;
    };
}

const MasterSettings: React.FC = () => {
    const [globalIban, setGlobalIban] = useState('A carregar...');
    const [payments, setPayments] = useState<PaymentWithTenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingIban, setSavingIban] = useState(false);

    const fetchDashboard = async () => {
        setLoading(true);
        if (!supabase) return;

        // Fetch IBAN
        const { data: bgData } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'global_iban')
            .maybeSingle();
        if (bgData) setGlobalIban(bgData.setting_value);

        // Fetch Payments
        const { data: payData, error: payErr } = await supabase
            .from('payments')
            .select('*, tenants(company_name)')
            .order('created_at', { ascending: false });

        if (!payErr && payData) {
            setPayments(payData as unknown as PaymentWithTenant[]);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const updateIban = async () => {
        if (!supabase) return;
        setSavingIban(true);
        const { error } = await supabase
            .from('system_settings')
            .upsert({ setting_key: 'global_iban', setting_value: globalIban });

        setSavingIban(false);
        if (error) alert('Erro ao atualizar IBAN');
        else alert('IBAN Global Atualizado com Sucesso.');
    };

    const approvePayment = async (paymentId: string, tenantId: string) => {
        if (!supabase) return;
        if (!window.confirm('Aprovar licença por +1 Ano para este cliente?')) return;

        try {
            // Update payment
            await supabase.from('payments').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', paymentId);

            // Add 1 year to subscription / trial
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);

            await supabase.from('tenants').update({
                status: 'active',
                trial_end_date: nextYear.toISOString()
            }).eq('id', tenantId);

            fetchDashboard();
        } catch (e) {
            console.error(e);
            alert('Erro ao processar aprovação.');
        }
    };

    const rejectPayment = async (paymentId: string) => {
        if (!supabase) return;
        if (!window.confirm('Rejeitar este pagamento? O utilizador continuará bloqueado.')) return;
        await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId);
        fetchDashboard();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Configurações Base (Master)</h2>
                    <p className="text-slate-500 font-medium">
                        Administração SaaS: Faturação, IBANs, e Aprovação de Pagamentos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Definicoes Gerais */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm col-span-1 border-t-4 border-t-amber-500">
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6">Variáveis de Sistema</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">IBAN Global para Pagamentos</label>
                            <input
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium text-slate-900 font-mono text-sm"
                                value={globalIban}
                                onChange={e => setGlobalIban(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={updateIban}
                            disabled={savingIban}
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow hover:bg-black transition-all"
                        >
                            {savingIban ? 'A guardar...' : 'Atualizar IBAN'}
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <div className="bg-amber-50 p-4 rounded-xl text-amber-800 text-xs font-medium border border-amber-100/50 leading-relaxed">
                            <i className="fas fa-info-circle mr-2 mb-2 text-amber-600 block text-lg"></i>
                            O IBAN definido acima será apresentado no Ecrã "Licença Expirada" de todas as empresas suspensas na plataforma.
                        </div>
                    </div>
                </div>

                {/* Confirmacoes Pagamento */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                        <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Comprovativos Pendentes</h3>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-100 shadow-sm">{payments.length} Registos</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Empresa (Tenant)</th>
                                    <th className="px-6 py-4">Valor Anual</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">A carregar comprovativos...</td>
                                    </tr>
                                )}
                                {!loading && payments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 text-2xl"><i className="fas fa-inbox"></i></div>
                                            Não há pagamentos pendentes de aprovação.
                                        </td>
                                    </tr>
                                )}
                                {payments.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">{new Date(p.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{p.tenants?.company_name || 'Desconhecida'}</td>
                                        <td className="px-6 py-4 font-bold text-indigo-600">{p.amount} {p.currency}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    p.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-rose-100 text-rose-700'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => window.open(p.proof_url, '_blank')}
                                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition-colors"
                                                title="Ver Comprovativo PDF/Imagem"
                                            >
                                                Ver
                                            </button>

                                            {p.status === 'pending' && (
                                                <>
                                                    <button onClick={() => approvePayment(p.id, p.tenant_id)} className="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold px-3 py-1.5 rounded-lg transition-colors">
                                                        Aprovar 1 Ano
                                                    </button>
                                                    <button onClick={() => rejectPayment(p.id)} className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 transition-colors">
                                                        Recusar
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MasterSettings;
