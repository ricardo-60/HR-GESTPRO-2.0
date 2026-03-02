import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

const ExpiredLicense: React.FC = () => {
    const { tenantStatus, tenantId, signOut } = useAuth();
    const [iban, setIban] = useState('A carregar IBAN...');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pendingPayment, setPendingPayment] = useState(false);

    useEffect(() => {
        const fetchSystemConfig = async () => {
            if (!supabase) return;
            // Get IBAN
            const { data: bgData } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'global_iban')
                .maybeSingle();

            if (bgData) setIban(bgData.setting_value);

            // Check if there is already a pending payment
            if (tenantId) {
                const { data: pData } = await supabase
                    .from('payments')
                    .select('id, status')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'pending')
                    .maybeSingle();

                if (pData) {
                    setPendingPayment(true);
                }
            }
        };
        fetchSystemConfig();
    }, [tenantId]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !supabase || !tenantId) return;
        setSubmitting(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${tenantId}_${Date.now()}.${fileExt}`;
            const filePath = `${tenantId}/${fileName}`;

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from('payment_proofs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL (for master admin to view easily)
            const { data: urlData } = supabase.storage
                .from('payment_proofs')
                .getPublicUrl(filePath);

            // 3. Register payment
            const { error: insertError } = await supabase
                .from('payments')
                .insert([{
                    tenant_id: tenantId,
                    amount: 65000.00,
                    currency: 'AOA',
                    status: 'pending',
                    proof_url: urlData.publicUrl
                }]);

            if (insertError) throw insertError;

            setSuccess(true);
            setPendingPayment(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-xl w-full">

                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl">
                    <i className="fas fa-lock"></i>
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Assinatura Expirada</h2>
                <p className="text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">
                    A licença da <span className="font-bold text-slate-800">{tenantStatus?.company_name}</span> terminou. Renove agora para continuar a utilizar o ERP HR-GESTPRO 2.0.
                </p>

                {pendingPayment ? (
                    <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl mb-8">
                        <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <i className="fas fa-clock"></i>
                        </div>
                        <h3 className="text-lg font-black text-amber-900 mb-2">Comprovativo em Análise</h3>
                        <p className="text-sm text-amber-700 font-medium">Os nossos serviços estão a rever o seu pagamento. A sua licença será ativada brevemente.</p>
                    </div>
                ) : (
                    <div className="text-left space-y-8">
                        {/* Instruções Pagamento */}
                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Plano Anual: 65.000,00 KZ</h3>
                            <p className="text-sm font-medium text-slate-600 mb-2">Por favor, efetue a transferência para o seguinte IBAN:</p>
                            <div className="bg-white p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
                                <span className="font-mono font-bold text-indigo-700 text-lg tracking-wider">{iban}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(iban)}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Copiar IBAN"
                                >
                                    <i className="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>

                        {/* Formulário Envio */}
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Enviar Comprovativo Bancário (PDF ou Imagem)</label>
                                <input
                                    type="file"
                                    required
                                    accept=".pdf,image/*"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 text-sm text-slate-600 outline-none"
                                />
                            </div>

                            {error && <p className="text-rose-600 text-[10px] font-black uppercase text-center">{error}</p>}

                            <button
                                type="submit"
                                disabled={submitting || !file}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50"
                            >
                                {submitting ? 'A processar documento...' : 'Submeter Comprovativo'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-8 border-t border-slate-100 pt-8">
                    <button onClick={signOut} className="text-slate-400 font-bold hover:text-slate-600 transition-all text-xs tracking-widest uppercase">
                        <i className="fas fa-sign-out-alt mr-2"></i> Terminar Sessão
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpiredLicense;
