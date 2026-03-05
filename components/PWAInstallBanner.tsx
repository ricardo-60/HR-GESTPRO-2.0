import React, { useState, useEffect } from 'react';

const PWAInstallBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Verifica se já está instalado ou se o utilizador já fechou o banner nesta sessão
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        const wasDismissed = sessionStorage.getItem('pwa_banner_dismissed');

        if (isMobile && !isInstalled && !wasDismissed) {
            setIsVisible(true);
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
            }
            setDeferredPrompt(null);
        } else {
            // Fallback: Mostrar instrução no Safari (iOS)
            alert('No iPhone/iPad: Clique no botão de Partilhar e selecione "Adicionar ao Ecrã Principal".');
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 z-[60] animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-2xl border border-white/10 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-indigo-500 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <i className="fas fa-rocket text-2xl uppercase italic">HGP</i>
                </div>
                <div>
                    <h3 className="text-lg font-black tracking-tight mb-1">HR-GESTPRO no Telemóvel</h3>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                        Instale para acesso instantâneo, uso da câmara para scanner e melhor performance.
                    </p>
                </div>
                <div className="flex gap-2 w-full">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-4 text-xs font-bold text-slate-500 hover:text-white transition-colors"
                    >
                        Agora Não
                    </button>
                    <button
                        onClick={handleInstall}
                        className="flex-1 py-4 bg-indigo-600 rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all uppercase tracking-widest"
                    >
                        Instalar App
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallBanner;
