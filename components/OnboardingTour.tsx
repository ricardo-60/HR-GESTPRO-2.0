import React, { useState, useEffect } from 'react';

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: string;
}

export const OnboardingTour: React.FC<{
    tenantName: string;
    onClose: () => void;
}> = ({ tenantName, onClose }) => {
    const [step, setStep] = useState(0);

    const steps: OnboardingStep[] = [
        {
            id: 'welcome',
            title: `Bem-vindo ao HR-GESTPRO 2.0, ${tenantName}!`,
            description: 'Estamos felizes por o ter connosco. Vamos configurar o seu negócio em 1 minuto?',
            icon: 'fa-rocket'
        },
        {
            id: 'settings',
            title: 'Configurações da Empresa',
            description: 'Vá a Empresas > Detalhes para carregar o seu logotipo e configurar dados fiscais (NIF, Morada).',
            icon: 'fa-building'
        },
        {
            id: 'inventory',
            title: 'Catálogo de Produtos',
            description: 'Adicione os seus produtos em Compras/Stock. Não se esqueça da foto para o PDV!',
            icon: 'fa-package'
        },
        {
            id: 'sales',
            title: 'Pronto para Vender',
            description: 'Abra o Caixa em Vendas e comece a faturar. O sistema funciona offline se a net cair!',
            icon: 'fa-cash-register'
        }
    ];

    const currentStep = steps[step];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden relative border border-white/20">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 text-3xl shadow-inner animate-bounce">
                        <i className={`fas ${currentStep.icon}`}></i>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">
                        {currentStep.title}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">
                        {currentStep.description}
                    </p>

                    <div className="flex flex-col space-y-3">
                        {step < steps.length - 1 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span>Próximo Passo</span>
                                <i className="fas fa-chevron-right text-xs"></i>
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95"
                            >
                                Vamos Começar!
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest pt-4"
                        >
                            Ignorar Guia
                        </button>
                    </div>
                </div>

                {/* WhatsApp Support Button */}
                <a
                    href="https://wa.me/244926102636"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    title="Suporte Direto"
                >
                    <i className="fab fa-whatsapp text-2xl"></i>
                </a>
            </div>
        </div>
    );
};
