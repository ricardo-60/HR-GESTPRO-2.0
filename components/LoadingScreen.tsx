import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" />

            <div className="relative flex flex-col items-center">
                {/* Animated Brand Icon - SVG from Manual */}
                <div className="w-24 h-24 mb-8 bg-white/5 rounded-[2.5rem] p-4 border border-white/10 shadow-2xl shadow-indigo-500/10 animate-in zoom-in duration-700">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                        <path d="M20 80L40 50L35 45L60 20L55 50L65 55L45 80H20Z" fill="#EA580C" className="animate-pulse" />
                        <path d="M10 90C30 90 70 10 90 10" stroke="#1E3A8A" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4" className="opacity-50" />
                    </svg>
                </div>

                {/* Text Loader */}
                <div className="text-center">
                    <h1 className="text-white text-sm font-black uppercase tracking-[0.4em] mb-2 opacity-80">
                        HR-GESTPRO <span className="text-[#EA580C]">2.0</span>
                    </h1>
                    <div className="flex items-center justify-center gap-1.5 h-1">
                        <div className="w-1 h-1 bg-[#EA580C] rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-[#EA580C] rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-[#EA580C] rounded-full animate-bounce" />
                    </div>
                </div>

                {/* System Info */}
                <div className="absolute bottom-[-100px] text-center w-64">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
                        A preparar ambiente de trabalho<br />
                        <span className="text-slate-800">Sincronização Certificada AGT</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
