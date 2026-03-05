import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import SalesManagement from '../pages/SalesManagement';
import StockManagement from '../pages/StockManagement';

const DemoAnimationScene: React.FC = () => {
    const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
    const [step, setStep] = useState(0);

    // Ciclo de Animação para Gravação
    useEffect(() => {
        const interval = setInterval(() => {
            setStep(s => (s + 1) % 4);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (step === 2) setView('mobile');
        else setView('desktop');
    }, [step]);

    return (
        <div className={`transition-all duration-1000 ${view === 'mobile' ? 'max-w-[390px] mx-auto border-[12px] border-slate-900 rounded-[3rem] h-[844px] overflow-hidden shadow-2xl mt-10' : 'w-full h-screen'}`}>
            <div className="h-full overflow-y-auto bg-white custom-scrollbar">
                {step === 0 && <Dashboard variant="admin" />}
                {step === 1 && <SalesManagement />}
                {step === 2 && <StockManagement />}
                {step === 3 && (
                    <div className="flex flex-col items-center justify-center h-full p-20 text-center space-y-8 animate-in zoom-in duration-1000">
                        <div className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white text-5xl shadow-2xl">
                            <i className="fas fa-rocket italic uppercase">HGP</i>
                        </div>
                        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic">HR-GESTPRO 2.0</h1>
                        <div className="flex items-center gap-4 bg-emerald-50 px-8 py-4 rounded-2xl border border-emerald-100">
                            <i className="fas fa-shield-alt text-emerald-600 text-2xl"></i>
                            <span className="text-emerald-900 font-black uppercase tracking-widest text-sm">Garantia de Segurança AGT</span>
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.5em] text-xs">Cloud Enterprise Solution</p>
                    </div>
                )}
            </div>

            {/* VFX Overlay: Data Beams simulation */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-pulse delay-75"></div>
                <div className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-pulse delay-300"></div>
            </div>
        </div>
    );
};

export default DemoAnimationScene;
