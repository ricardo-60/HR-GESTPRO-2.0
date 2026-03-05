import React, { useState, useEffect, useCallback } from 'react';
import {
    KeyRound, Plus, Check, Copy, Users, FileText, Settings,
    RefreshCw, AlertCircle, CheckCircle2, Loader2, Clock,
    Download, TrendingUp, ShieldCheck, BanknoteIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { downloadProformaPDF } from '../lib/ProformaGenerator';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TenantRow {
    id: string;
    company_name: string;
    status: string;
    plan_type: string;
    license_expires_at: string | null;
    trial_end_date: string | null;
    contact_email: string | null;
}

interface LicenseKey {
    id: string;
    key_code: string;
    duration_days: number;
    plan_type: string;
    status: string;
    created_at: string;
    tenant_id_redeemed: string | null;
}

interface SubInvoice {
    id: string;
    tenant_id: string;
    amount: number;
    currency: string;
    status: string;
    type: string;
    due_date: string;
    created_at: string;
    tenants?: { company_name: string };
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

const daysUntil = (dateStr: string | null): number => {
    if (!dateStr) return -999;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
};

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700',
        trial: 'bg-blue-100 text-blue-700',
        expired: 'bg-red-100 text-red-700',
        suspended: 'bg-amber-100 text-amber-700',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const MasterSettings: React.FC = () => {
    const [tab, setTab] = useState<'tenants' | 'keys' | 'invoices' | 'settings'>('tenants');
    const [tenants, setTenants] = useState<TenantRow[]>([]);
    const [keys, setKeys] = useState<LicenseKey[]>([]);
    const [invoices, setInvoices] = useState<SubInvoice[]>([]);
    const [globalIban, setGlobalIban] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingIban, setSavingIban] = useState(false);

    // Gerador de chaves
    const [genDuration, setGenDuration] = useState(365);
    const [genPlan, setGenPlan] = useState('Business');
    const [isGenerating, setIsGenerating] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        const [tRes, kRes, iRes, sRes] = await Promise.all([
            supabase.from('tenants').select('id,company_name,status,plan_type,license_expires_at,trial_end_date,contact_email').order('created_at', { ascending: false }),
            supabase.from('license_keys').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('subscription_invoices').select('*, tenants(company_name)').order('created_at', { ascending: false }).limit(100),
            supabase.from('system_settings').select('setting_value').eq('setting_key', 'global_iban').maybeSingle(),
        ]);
        if (tRes.data) setTenants(tRes.data as TenantRow[]);
        if (kRes.data) setKeys(kRes.data as LicenseKey[]);
        if (iRes.data) setInvoices(iRes.data as SubInvoice[]);
        if (sRes.data) setGlobalIban(sRes.data.setting_value || '');
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Gerar nova chave ──────────────────────────────────────────────────────
    const handleGenerateKey = async () => {
        if (!supabase) return;
        setIsGenerating(true);
        setNewKey(null);
        try {
            // Gerar código único via função SQL
            const { data: codeData } = await supabase.rpc('generate_license_key_code');
            const code = codeData as string;

            const { error } = await supabase.from('license_keys').insert({
                key_code: code,
                duration_days: genDuration,
                plan_type: genPlan,
                status: 'unused',
                created_by: (await supabase.auth.getUser()).data.user?.id,
            });
            if (error) throw error;

            setNewKey(code);
            await fetchAll();
        } catch (e: any) {
            alert('Erro ao gerar chave: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyKey = () => {
        if (newKey) {
            navigator.clipboard.writeText(newKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // ── Aprovar fatura proforma ───────────────────────────────────────────────
    const handleApproveInvoice = async (invoice: SubInvoice) => {
        if (!supabase) return;
        if (!window.confirm(`Confirmar pagamento de ${new Intl.NumberFormat('pt-PT').format(invoice.amount)} AOA para ${invoice.tenants?.company_name}?\nIsto irá ativar/renovar a licença por 365 dias.`)) return;

        try {
            await supabase.from('subscription_invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', invoice.id);
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            await supabase.from('tenants').update({ status: 'active', license_expires_at: nextYear.toISOString() }).eq('id', invoice.tenant_id);
            await fetchAll();
        } catch (e: any) {
            alert('Erro: ' + e.message);
        }
    };

    // ── Download PDF Proforma ─────────────────────────────────────────────────
    const handleDownloadProforma = async (invoice: SubInvoice) => {
        const tenant = tenants.find(t => t.id === invoice.tenant_id);
        downloadProformaPDF({
            invoiceRef: `PRF-${new Date(invoice.created_at).getFullYear()}-${invoice.id.substring(0, 6).toUpperCase()}`,
            dueDate: invoice.due_date,
            clientName: tenant?.company_name || 'Cliente',
            planType: tenant?.plan_type || 'Business',
            durationDays: 365,
            amountAOA: invoice.amount,
            globalIban,
        });
    };

    // ── Guardar IBAN ─────────────────────────────────────────────────────────
    const saveIban = async () => {
        if (!supabase) return;
        setSavingIban(true);
        await supabase.from('system_settings').upsert({ setting_key: 'global_iban', setting_value: globalIban });
        setSavingIban(false);
    };

    const tabs = [
        { id: 'tenants', label: 'Empresas', icon: Users },
        { id: 'keys', label: 'Chaves', icon: KeyRound },
        { id: 'invoices', label: 'Faturas', icon: FileText },
        { id: 'settings', label: 'Configurações', icon: Settings },
    ] as const;

    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="border-b border-slate-100 pb-6">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Painel Master</h2>
                <p className="text-slate-500 mt-1">Gestão de licenças, empresas e faturação SaaS.</p>
            </div>

            {/* Stats rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Empresas Ativas', value: tenants.filter(t => t.status === 'active').length, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Em Trial', value: tenants.filter(t => t.status === 'trial').length, icon: Clock, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Chaves Disponíveis', value: keys.filter(k => k.status === 'unused').length, icon: KeyRound, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Faturas Pendentes', value: pendingInvoices, icon: BanknoteIcon, color: 'text-amber-600 bg-amber-50' },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 flex">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative ${tab === t.id
                                    ? 'text-indigo-600 bg-indigo-50/50'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                            {t.id === 'invoices' && pendingInvoices > 0 && (
                                <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingInvoices}</span>
                            )}
                            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t" />}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center px-4">
                        <button onClick={fetchAll} disabled={loading} className="text-slate-400 hover:text-slate-700 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="p-6">

                    {/* === Tab: Empresas === */}
                    {tab === 'tenants' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="py-3 pr-4">Empresa</th>
                                        <th className="py-3 pr-4">Plano</th>
                                        <th className="py-3 pr-4">Status</th>
                                        <th className="py-3 pr-4">Expira Em</th>
                                        <th className="py-3">Dias Restantes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tenants.map(t => {
                                        const days = daysUntil(t.license_expires_at || t.trial_end_date);
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 pr-4">
                                                    <p className="font-bold text-slate-800">{t.company_name}</p>
                                                    {t.contact_email && <p className="text-xs text-slate-400">{t.contact_email}</p>}
                                                </td>
                                                <td className="py-3 pr-4 text-xs font-semibold text-slate-600">{t.plan_type || '—'}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusBadge(t.status)}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 text-xs font-mono text-slate-500">
                                                    {t.license_expires_at ? new Date(t.license_expires_at).toLocaleDateString('pt-PT') : t.trial_end_date ? new Date(t.trial_end_date).toLocaleDateString('pt-PT') : '—'}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`font-bold text-sm ${days < 0 ? 'text-red-500' : days < 7 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                                        {days < 0 ? 'EXPIRADO' : `${days} dias`}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* === Tab: Chaves === */}
                    {tab === 'keys' && (
                        <div className="space-y-6">
                            {/* Gerador */}
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-indigo-600" /> Gerar Nova Chave
                                </h3>
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duração</label>
                                        <div className="flex gap-2">
                                            {[30, 90, 365].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setGenDuration(d)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${genDuration === d ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                                                >
                                                    {d === 365 ? '1 Ano' : `${d} Dias`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plano</label>
                                        <select
                                            value={genPlan}
                                            onChange={e => setGenPlan(e.target.value)}
                                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {['Trial', 'Empreendedor', 'Business', 'Enterprise'].map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleGenerateKey}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                        Gerar Chave
                                    </button>
                                </div>

                                {newKey && (
                                    <div className="mt-4 bg-white border-2 border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Nova Chave Gerada</p>
                                            <p className="font-mono text-xl font-black tracking-[0.2em] text-indigo-700">{newKey}</p>
                                        </div>
                                        <button
                                            onClick={copyKey}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                                        >
                                            {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Histórico de Chaves */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="py-3 pr-4">Código</th>
                                            <th className="py-3 pr-4">Plano</th>
                                            <th className="py-3 pr-4">Duração</th>
                                            <th className="py-3 pr-4">Status</th>
                                            <th className="py-3">Criado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {keys.map(k => (
                                            <tr key={k.id} className="hover:bg-slate-50/50">
                                                <td className="py-3 pr-4 font-mono font-bold text-slate-800 tracking-wider">{k.key_code}</td>
                                                <td className="py-3 pr-4 text-xs text-slate-600 font-medium">{k.plan_type}</td>
                                                <td className="py-3 pr-4 text-xs text-slate-500">{k.duration_days === 365 ? '1 Ano' : `${k.duration_days} Dias`}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${k.status === 'unused' ? 'bg-emerald-100 text-emerald-700' :
                                                            k.status === 'used' ? 'bg-slate-100 text-slate-500' :
                                                                'bg-red-100 text-red-600'
                                                        }`}>
                                                        {k.status === 'unused' ? 'disponível' : k.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-xs text-slate-400 font-mono">{new Date(k.created_at).toLocaleDateString('pt-PT')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* === Tab: Faturas === */}
                    {tab === 'invoices' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="py-3 pr-4">Data</th>
                                        <th className="py-3 pr-4">Empresa</th>
                                        <th className="py-3 pr-4">Tipo</th>
                                        <th className="py-3 pr-4">Valor</th>
                                        <th className="py-3 pr-4">Status</th>
                                        <th className="py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50">
                                            <td className="py-3 pr-4 text-xs font-mono text-slate-500">{new Date(inv.created_at).toLocaleDateString('pt-PT')}</td>
                                            <td className="py-3 pr-4 font-bold text-slate-800">{inv.tenants?.company_name || '—'}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${inv.type === 'PROFORMA' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                    {inv.type}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 font-bold text-indigo-600">{new Intl.NumberFormat('pt-PT').format(inv.amount)} Kz</td>
                                            <td className="py-3 pr-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${inv.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownloadProforma(inv)}
                                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                                >
                                                    <Download className="w-3 h-3" /> PDF
                                                </button>
                                                {inv.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleApproveInvoice(inv)}
                                                        className="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" /> Aprovar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {invoices.length === 0 && !loading && (
                                        <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Sem faturas registadas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* === Tab: Configurações === */}
                    {tab === 'settings' && (
                        <div className="max-w-md space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">IBAN para Pagamentos</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={globalIban}
                                    onChange={e => setGlobalIban(e.target.value)}
                                    placeholder="AO06 0040 0000 0000 0000 0000 0"
                                />
                                <p className="text-xs text-slate-400">Aparece no ecrã de licença expirada e nos PDFs de proforma.</p>
                            </div>
                            <button
                                onClick={saveIban}
                                disabled={savingIban}
                                className="flex items-center gap-2 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl transition-all hover:bg-black"
                            >
                                {savingIban ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                {savingIban ? 'A guardar...' : 'Guardar IBAN'}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default MasterSettings;
