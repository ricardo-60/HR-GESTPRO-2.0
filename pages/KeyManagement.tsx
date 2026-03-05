import React, { useState, useEffect } from 'react';
import { KeyRound, Download, ShieldCheck, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { generateRSAKeyPair, downloadPemFile, AgtKeyPair } from '../lib/agtSigner';
import { supabase } from '../lib/supabase';

export default function KeyManagement() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [newKeyPair, setNewKeyPair] = useState<AgtKeyPair | null>(null);
    const [existingKey, setExistingKey] = useState<{ key_name: string; created_at: string; public_key: string } | null>(null);
    const [showPublicKey, setShowPublicKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadExistingKey();
    }, []);

    const loadExistingKey = async () => {
        const { data } = await supabase
            .from('agt_keys')
            .select('key_name, created_at, public_key')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (data) setExistingKey(data);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setNewKeyPair(null);
        setSaved(false);
        try {
            const keyPair = await generateRSAKeyPair();
            setNewKeyPair(keyPair);
        } catch (e: any) {
            setError('Erro ao gerar chaves RSA: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSavePublicKey = async () => {
        if (!newKeyPair) return;
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada.');
            const { data: profile } = await supabase
                .from('user_profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile) throw new Error('Perfil não encontrado.');

            // Desativar chave anterior
            await supabase.from('agt_keys').update({ is_active: false })
                .eq('tenant_id', profile.tenant_id);

            // Guardar nova chave pública
            const { error: insertError } = await supabase.from('agt_keys').insert({
                tenant_id: profile.tenant_id,
                public_key: newKeyPair.publicKeyBase64,
                key_name: `Chave RSA-2048 — ${new Date().toLocaleDateString('pt-PT')}`,
                is_active: true,
            });
            if (insertError) throw insertError;

            setSaved(true);
            await loadExistingKey();
        } catch (e: any) {
            setError('Erro ao guardar chave pública: ' + e.message);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <KeyRound className="w-8 h-8 text-indigo-600" />
                    Gestão de Chaves AGT
                </h1>
                <p className="text-slate-500 mt-1">
                    Gera e gere o par de chaves RSA para assinatura digital de faturas (Certificação AGT).
                </p>
            </div>

            {/* Aviso de Segurança */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-1">
                <p className="font-bold text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Aviso de Segurança Crítico
                </p>
                <p className="text-sm text-amber-700">
                    A <strong>chave privada</strong> nunca é enviada ao servidor. Após geração, descarrega o ficheiro
                    <code className="mx-1 bg-amber-100 px-1 rounded">.pem</code> imediatamente e guarda-o em lugar seguro
                    (cofre, USB cifrado ou gestor de passwords). Não há como recuperá-la se for perdida.
                </p>
            </div>

            {/* Chave Ativa */}
            {existingKey && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-green-100 p-2 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Chave Pública Ativa</h3>
                            <p className="text-xs text-slate-500">{existingKey.key_name} — {new Date(existingKey.created_at).toLocaleDateString('pt-PT')}</p>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            readOnly
                            rows={3}
                            className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none"
                            value={showPublicKey ? existingKey.public_key : '•'.repeat(80)}
                        />
                        <button
                            onClick={() => setShowPublicKey(v => !v)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                            {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Gerador */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h2 className="font-bold text-slate-800 text-lg">Gerar Novo Par de Chaves</h2>
                <p className="text-sm text-slate-500">
                    Gera um par de chaves RSA-2048 para assinar as tuas faturas digitalmente.
                    Faz este processo <strong>apenas uma vez</strong> por empresa, ou quando a chave anterior for comprometida.
                </p>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                    {isGenerating ? 'A gerar RSA-2048...' : 'Gerar Par de Chaves RSA'}
                </button>
            </div>

            {/* Resultado */}
            {newKeyPair && (
                <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold">
                        <CheckCircle2 className="w-5 h-5" /> Par de Chaves Gerado!
                    </div>

                    <div className="space-y-3">
                        {/* Chave Pública */}
                        <div>
                            <p className="text-sm font-semibold text-slate-600 mb-1">Chave Pública (submeter à AGT)</p>
                            <textarea
                                readOnly rows={4}
                                className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none"
                                value={newKeyPair.publicKeyPem}
                            />
                            <button
                                onClick={() => downloadPemFile(newKeyPair.publicKeyPem, 'hr-gestpro-public-key.pem')}
                                className="mt-2 flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 font-medium"
                            >
                                <Download className="w-4 h-4" /> Descarregar Chave Pública (.pem)
                            </button>
                        </div>

                        {/* Chave Privada */}
                        <div>
                            <p className="text-sm font-semibold text-red-600 mb-1">⚠️ Chave Privada (guardar em local seguro — não partilhar)</p>
                            <textarea
                                readOnly rows={4}
                                className="w-full font-mono text-xs p-3 bg-red-50 border border-red-200 rounded-xl resize-none"
                                value={'•'.repeat(120) + '\n(Descarrega o ficheiro .pem para ver o conteúdo)'}
                            />
                            <button
                                onClick={() => downloadPemFile(newKeyPair.privateKeyPem, 'hr-gestpro-PRIVATE-key-GUARDAR-SEGURO.pem')}
                                className="mt-2 flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-bold"
                            >
                                <Download className="w-4 h-4" /> Descarregar Chave Privada (.pem) — OBRIGATÓRIO
                            </button>
                        </div>
                    </div>

                    {saved ? (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl font-semibold">
                            <CheckCircle2 className="w-5 h-5" /> Chave pública guardada no sistema!
                        </div>
                    ) : (
                        <button
                            onClick={handleSavePublicKey}
                            className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <ShieldCheck className="w-5 h-5" /> Guardar Chave Pública no Sistema
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}
        </div>
    );
}
