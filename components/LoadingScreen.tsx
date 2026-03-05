import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" />

            <div className="relative flex flex-col items-center">
                {/* Animated HR Logo */}
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-8 animate-in zoom-in duration-700">
                    <span className="text-white font-black text-2xl tracking-tighter">HR</span>
                </div>

                {/* Text Loader */}
                <div className="text-center">
                    <h1 className="text-white text-sm font-black uppercase tracking-[0.4em] mb-2 opacity-80">HR-GESTPRO 2.0</h1>
                    <div className="flex items-center justify-center gap-1.5 h-1">
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
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

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.2; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}} />
        </div>
    );
};

export default LoadingScreen;
