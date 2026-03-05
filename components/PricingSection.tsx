import React, { useState } from 'react';
import { Check, ArrowRight, Shield, Zap, HelpCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function PricingSection({ onLogin }: { onLogin: () => void }) {
    const [isAnnual, setIsAnnual] = useState(false);
    const { user } = useAuth();

    const plans = [
        {
            name: 'Empreendedor',
            price: 15000,
            desc: 'Para pequenos negócios e freelancers.',
            features: [
                'Até 2 utilizadores',
                'Faturação ilimitada',
                'Gestão de Stock básica',
                'Suporte via Email',
            ],
            popular: false
        },
        {
            name: 'Business',
            price: 35000,
            desc: 'O equilíbrio perfeito para PMEs em crescimento.',
            features: [
                'Utilizadores ilimitados',
                'Gestão de Stock avançada (PMP)',
                'Módulo de RH & Salários',
                'Exportação SAFT-AO Certificada',
                'Suporte WhatsApp Prioritário',
            ],
            popular: true
        },
        {
            name: 'Enterprise',
            price: 75000,
            desc: 'Solução robusta para grandes operações.',
            features: [
                'Tudo do plano Business',
                'Multi-armazém',
                'API de Integração',
                'Backup Georedundante',
                'Gestor de Conta dedicado',
            ],
            popular: false
        }
    ];

    const calculatePrice = (monthlyPrice: number) => {
        if (!isAnnual) return monthlyPrice;
        // 15% de desconto no anual
        const annualMonthly = monthlyPrice * 0.85;
        return Math.floor(annualMonthly);
    };

    const faqs = [
        { q: 'Quais os métodos de pagamento aceites?', a: 'Aceitamos Transferência Bancária (IBAN), Multicaixa Express e Depósito em conta (BFA, BAI, BCI).' },
        { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Não existem contratos de fidelização. Se cancelar, manterá o acesso até ao fim do período pago.' },
        { q: 'O sistema é realmente certificado pela AGT?', a: 'Sim. O HR-GESTPRO 2.0 utiliza algoritmos de assinatura RSA validados, cumprindo todas as normas fiscais vigentes em Angola.' }
    ];

    return (
        <section className="py-24 px-6 bg-slate-950 relative overflow-hidden" id="pricing">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                        Planos que crescem com o seu <span className="text-indigo-400 font-black italic">Negócio</span>
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg mb-10">
                        Escolha a transparência. Sem taxas escondidas, sem letras pequenas.
                    </p>

                    {/* F Billing Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-bold ${!isAnnual ? 'text-white' : 'text-slate-500'}`}>Mensal</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="w-14 h-7 bg-slate-800 rounded-full p-1 transition-colors relative"
                        >
                            <div className={`w-5 h-5 bg-indigo-500 rounded-full transition-transform ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-sm font-bold ${isAnnual ? 'text-white' : 'text-slate-500'}`}>
                            Anual <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full ml-1">Poupa 15%</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative bg-slate-900/40 border-2 rounded-[2.5rem] p-8 transition-all hover:-translate-y-2 flex flex-col ${plan.popular ? 'border-indigo-600 shadow-2xl shadow-indigo-600/20' : 'border-slate-800/50 hover:border-slate-700'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                                    Mais Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-black text-white mb-2">{plan.name}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">{plan.desc}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-white">
                                        {new Intl.NumberFormat('pt-PT').format(calculatePrice(plan.price))}
                                    </span>
                                    <span className="text-slate-500 font-bold uppercase text-[10px]">Kz / mês</span>
                                </div>
                                {isAnnual && (
                                    <p className="text-emerald-500 text-[10px] font-black uppercase mt-2">
                                        Faturado anualmente ({new Intl.NumberFormat('pt-PT').format(calculatePrice(plan.price) * 12)} Kz)
                                    </p>
                                )}
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-5 h-5 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-indigo-400" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={onLogin}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${plan.popular
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                    }`}
                            >
                                {user ? 'Renovar Plano Agora' : 'Começar Trial Gratuito'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* FAQ Sub-section */}
                <div className="mt-24 pt-16 border-t border-slate-900">
                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="md:w-1/3">
                            <div className="flex items-center gap-2 mb-4">
                                <HelpCircle className="w-5 h-5 text-indigo-400" />
                                <h4 className="text-xl font-black text-white">Dúvidas Frequentes</h4>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Tem mais perguntas? Fale diretamente com o nosso suporte via WhatsApp.
                            </p>
                            <div className="mt-8 p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Métodos de Pagamento</p>
                                <p className="text-xs text-slate-300 flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> IBAN · Multicaixa Express · BFA/BAI
                                </p>
                            </div>
                        </div>
                        <div className="md:w-2/3 grid grid-cols-1 gap-8">
                            {faqs.map((faq, i) => (
                                <div key={i} className="group">
                                    <h5 className="font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{faq.q}</h5>
                                    <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Trust Banner */}
                <div className="mt-16 bg-gradient-to-r from-slate-900 to-indigo-950/40 rounded-3xl p-8 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-white font-bold">Pagamento 100% Seguro</p>
                            <p className="text-slate-400 text-xs tracking-tight">Conformidade total com a certificação AGT Angola.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                        <div className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase text-slate-300 border border-white/5">Multicaixa</div>
                        <div className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase text-slate-300 border border-white/5">BFA Express</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
