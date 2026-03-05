import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, X, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LicenseActivationModalProps {
    tenantId: string;
    onSuccess: (newExpiresAt: string) => void;
    onClose: () => void;
}

export default function LicenseActivationModal({ tenantId, onSuccess, onClose }: LicenseActivationModalProps) {
    const [keyCode, setKeyCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; newExpiresAt?: string } | null>(null);

    // Formata automaticamente o input no padrão HGP-XXXX-XXXX-XXXX
    const handleKeyInput = (value: string) => {
        const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
        let formatted = '';
        if (clean.length <= 3) {
            formatted = clean;
        } else if (clean.length <= 7) {
            formatted = `${clean.slice(0, 3)}-${clean.slice(3)}`;
        } else if (clean.length <= 11) {
            formatted = `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
        } else {
            formatted = `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}-${clean.slice(11)}`;
        }
        setKeyCode(formatted);
    };

    const handleActivate = async () => {
        if (keyCode.replace(/-/g, '').length < 15) {
            setResult({ success: false, message: 'Código de ativação incompleto. Formato: HGP-XXXX-XXXX-XXXX' });
            return;
        }
        setIsLoading(true);
        setResult(null);
        try {
            const { data, error } = await supabase!.rpc('redeem_license_key', {
                p_key_code: keyCode,
                p_tenant_id: tenantId,
            });
            if (error) throw error;

            const res = data as any;
            if (res.success) {
                setResult({ success: true, message: res.message, newExpiresAt: res.new_expires_at });
                setTimeout(() => onSuccess(res.new_expires_at), 2000);
            } else {
                const friendlyErrors: Record<string, string> = {
                    KEY_NOT_FOUND: 'Código não encontrado. Verifica se introduziste corretamente.',
                    KEY_ALREADY_USED: 'Este código já foi utilizado anteriormente.',
                    CONCURRENT_REDEMPTION: 'Tentativa duplicada detetada. Aguarda e tenta novamente.',
                    UNAUTHORIZED: 'Não tens permissão para ativar licenças nesta empresa.',
                };
                setResult({ success: false, message: friendlyErrors[res.error_code] || res.message });
            }
        } catch (e: any) {
            setResult({ success: false, message: 'Erro de ligação ao servidor. Tenta novamente.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-slate-950 p-8 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                        <KeyRound className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">Ativar Licença</h2>
                    <p className="text-slate-400 text-sm mt-1">Insere o código de ativação fornecido pela HR Tecnologias.</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* Input da Chave */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                            Código de Ativação
                        </label>
                        <input
                            type="text"
                            value={keyCode}
                            onChange={e => handleKeyInput(e.target.value)}
                            placeholder="HGP-XXXX-XXXX-XXXX"
                            maxLength={19}
                            disabled={isLoading || result?.success}
                            className="w-full font-mono text-lg font-bold tracking-[0.25em] text-center px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all disabled:opacity-60"
                        />
                        <p className="text-xs text-slate-400 text-center">
                            Formato: HGP-XXXX-XXXX-XXXX (letras e números)
                        </p>
                    </div>

                    {/* Resultado */}
                    {result && (
                        <div className={`rounded-2xl p-4 flex items-start gap-3 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            {result.success
                                ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                : <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                            <div>
                                <p className={`font-bold text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                    {result.message}
                                </p>
                                {result.success && result.newExpiresAt && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <Timer className="w-3 h-3" />
                                        Válida até: <strong>{new Date(result.newExpiresAt).toLocaleDateString('pt-PT')}</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Botão */}
                    {!result?.success && (
                        <button
                            onClick={handleActivate}
                            disabled={isLoading || keyCode.replace(/-/g, '').length < 15}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0"
                        >
                            {isLoading
                                ? <><Loader2 className="w-5 h-5 animate-spin" /> A verificar...</>
                                : <><KeyRound className="w-5 h-5" /> Ativar Licença</>}
                        </button>
                    )}

                    <p className="text-center text-xs text-slate-400">
                        Não tem uma chave?{' '}
                        <a href="mailto:billing@hrgestpro.ao" className="text-indigo-600 font-semibold hover:underline">
                            Contacta billing@hrgestpro.ao
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
