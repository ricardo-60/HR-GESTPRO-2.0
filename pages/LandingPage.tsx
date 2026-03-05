import React from 'react';
import {
    Download, Globe, Shield, Zap, BarChart3, Users,
    CheckCircle2, ArrowRight, Star, Package
} from 'lucide-react';
import PricingSection from '../components/PricingSection';

const GITHUB_REPO = 'ricardo-60/HR-GESTPRO-2.0';
const DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/HR-GESTPRO-Setup.exe`;
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;

interface LandingPageProps {
    onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
    const features = [
        { icon: BarChart3, title: 'Relatórios BI', desc: 'Dashboard com métricas em tempo real e exportação SAFT-AO' },
        { icon: Package, title: 'Gestão de Stock', desc: 'Controlo de inventário com PMP automático e alertas de mínimos' },
        { icon: Users, title: 'Recursos Humanos', desc: 'Gestão de colaboradores, presenças e processamento salarial' },
        { icon: Shield, title: 'Conformidade AGT', desc: 'Assinatura digital RSA, hash encadeado e exportação XML para a AGT' },
        { icon: Zap, title: 'PDV Offline', desc: 'Ponto de venda funciona sem internet — sincroniza automaticamente' },
        { icon: Globe, title: 'Multi-tenant SaaS', desc: 'Isolamento total de dados por empresa, acessível em qualquer browser' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl p-2 border border-white/10 flex items-center justify-center shadow-lg">
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(234,88,12,0.4)]">
                                <path d="M20 80L40 50L35 45L60 20L55 50L65 55L45 80H20Z" fill="#EA580C" />
                                <path d="M10 90C30 90 70 10 90 10" stroke="#1E3A8A" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4" className="opacity-50" />
                            </svg>
                        </div>
                        <span className="font-black text-xl tracking-tight">HR-GESTPRO <span className="text-[#EA580C]">2.0</span></span>
                    </div>
                    <button
                        onClick={onLogin}
                        className="flex items-center gap-2 py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20"
                    >
                        Entrar <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-20 px-6 text-center relative">
                {/* Glow bg */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/50 rounded-full px-4 py-2 text-sm text-indigo-300 mb-8">
                        <Star className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
                        Software de Gestão Empresarial para Angola
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
                        Gere a tua empresa<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                            sem limites
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
                        ERP completo para PMEs angolanas — Faturação, Stock, RH, PDV e conformidade AGT.
                        Na cloud ou como app desktop.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {/* CTA Principal — Download */}
                        <a
                            href={DOWNLOAD_URL}
                            className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:-translate-y-1 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50"
                        >
                            <Download className="w-6 h-6 group-hover:animate-bounce" />
                            Descarregar App Desktop
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">.exe</span>
                        </a>

                        {/* CTA Secundário — Browser */}
                        <button
                            onClick={onLogin}
                            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-all hover:-translate-y-0.5"
                        >
                            <Globe className="w-5 h-5" />
                            Aceder via Browser
                        </button>
                    </div>

                    <p className="mt-4 text-sm text-slate-500">
                        Windows 10/11 · 64-bit · Gratuito durante o período de avaliação
                    </p>
                </div>
            </section>

            {/* Releases link */}
            <div className="flex justify-center pb-10">
                <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-400 transition-colors"
                >
                    Ver todas as versões no GitHub <ArrowRight className="w-3.5 h-3.5" />
                </a>
            </div>

            {/* Features */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <h2 className="text-3xl font-black text-center mb-4">Tudo o que precisas numa só plataforma</h2>
                <p className="text-slate-400 text-center mb-12">Desenvolvido especificamente para o mercado angolano, com conformidade AGT integrada.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-indigo-800/50 transition-all hover:-translate-y-1 group">
                            <div className="w-12 h-12 bg-indigo-950 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-900 transition-colors">
                                <f.icon className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <PricingSection onLogin={onLogin} />

            {/* Compliance AGT Banner */}
            <section className="max-w-6xl mx-auto px-6 py-10">
                <div className="bg-gradient-to-r from-indigo-950 to-violet-950 border border-indigo-800/40 rounded-3xl p-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-5 h-5 text-indigo-400" />
                            <span className="text-indigo-400 text-sm font-bold uppercase tracking-widest">Certificação AGT</span>
                        </div>
                        <h3 className="text-2xl font-black mb-3">Pronto para certificação AGT Angola</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Assinatura digital RSA encadeada, exportação SAFT-AO XML v1.04, sequencialidade de faturas protegida por triggers SQL e impressão dos 4 caracteres de hash obrigatórios.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {['SAFT-AO XML', 'Hash RSA Encadeado', 'IVA 14%', 'Regime Geral & Exclusão'].map(tag => (
                                <span key={tag} className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full text-xs font-medium text-slate-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 mt-16 py-10 text-center text-slate-500 text-sm">
                <p className="font-bold text-slate-400 mb-1">HR-GESTPRO 2.0</p>
                <p>© 2026 HR Tecnologias · Processado por programa validado nº 000/AGT</p>
                <div className="flex justify-center gap-6 mt-4">
                    <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">GitHub Releases</a>
                    <button onClick={onLogin} className="hover:text-indigo-400 transition-colors">Entrar na Plataforma</button>
                </div>
            </footer>
        </div>
    );
}
