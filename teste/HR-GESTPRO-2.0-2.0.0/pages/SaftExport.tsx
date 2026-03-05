import React, { useState } from 'react';
import {
    FileText, Download, CheckCircle2, AlertTriangle, AlertCircle,
    Calendar, Loader2, Shield, ChevronRight
} from 'lucide-react';
import { generateSaftAO, downloadSaftXml, validateSaftData, SaftPeriod, SaftValidationIssue } from '../lib/SaftGenerator';
import { supabase } from '../lib/supabase';

export default function SaftExport() {
    const currentDate = new Date();
    const [year, setYear] = useState(currentDate.getFullYear());
    const [month, setMonth] = useState(currentDate.getMonth()); // 0-indexed → usamos +1
    const [isValidating, setIsValidating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [issues, setIssues] = useState<SaftValidationIssue[] | null>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const period: SaftPeriod = { year, month: month + 1 };

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const handleValidate = async () => {
        setIsValidating(true);
        setIssues(null);
        setSuccess(false);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada.');
            const { data: profile } = await supabase
                .from('user_profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile) throw new Error('Perfil não encontrado.');
            const found = await validateSaftData(profile.tenant_id, period);
            setIssues(found);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsValidating(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setSuccess(false);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada.');
            const { data: profile } = await supabase
                .from('user_profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile) throw new Error('Perfil não encontrado.');
            const xml = await generateSaftAO(profile.tenant_id, period);
            downloadSaftXml(xml, period);
            setSuccess(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const hasErrors = issues?.some(i => i.type === 'error') ?? false;
    const hasWarnings = issues?.some(i => i.type === 'warning') ?? false;

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    Exportação SAFT-AO
                </h1>
                <p className="text-slate-500 mt-1">
                    Gera o ficheiro XML de auditoria fiscal para submissão à <strong>AGT Angola</strong>.
                </p>
            </div>

            {/* Seletor de Período */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    Selecionar Período
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-600">Mês</label>
                        <select
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={month}
                            onChange={e => { setMonth(Number(e.target.value)); setIssues(null); setSuccess(false); }}
                        >
                            {monthNames.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-600">Ano</label>
                        <select
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={year}
                            onChange={e => { setYear(Number(e.target.value)); setIssues(null); setSuccess(false); }}
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Validação Prévia */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-400" />
                        Validador Prévio
                    </h2>
                    <button
                        onClick={handleValidate}
                        disabled={isValidating}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                        {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        {isValidating ? 'A verificar...' : 'Verificar Dados'}
                    </button>
                </div>

                {issues !== null && (
                    <div className="space-y-2">
                        {issues.length === 0 ? (
                            <div className="flex items-center gap-3 bg-green-50 text-green-700 p-4 rounded-xl">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-semibold">Tudo em ordem! Pronto para gerar o SAFT-AO.</span>
                            </div>
                        ) : (
                            issues.map((issue, i) => (
                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl text-sm ${issue.type === 'error'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}>
                                    {issue.type === 'error'
                                        ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                                    <div>
                                        <span className="font-bold">{issue.entity}:</span> {issue.message}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Erros e Sucesso */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Ficheiro <strong>SAFT-AO_{year}_{String(month + 1).padStart(2, '0')}.xml</strong> transferido com sucesso!</span>
                </div>
            )}

            {/* Botão Principal */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || hasErrors}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 flex items-center justify-center gap-3 text-lg disabled:shadow-none disabled:translate-y-0"
            >
                {isGenerating
                    ? <><Loader2 className="w-6 h-6 animate-spin" /> A gerar XML...</>
                    : <><Download className="w-6 h-6" /> Gerar SAFT-AO — {monthNames[month]} {year}</>}
            </button>

            {hasErrors && (
                <p className="text-center text-sm text-red-500">
                    Corrige os erros acima antes de gerar o ficheiro.
                </p>
            )}
            {hasWarnings && !hasErrors && (
                <p className="text-center text-sm text-amber-600">
                    Existem avisos — o ficheiro pode ser gerado, mas revê-os antes de submeter à AGT.
                </p>
            )}
        </div>
    );
}
