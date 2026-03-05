import React from 'react';

const AgtSeal: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <style>
                {`
                    @keyframes rotate-light {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes pulse-gold {
                        0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.4)); }
                        50% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)); }
                    }
                    .seal-outer {
                        animation: rotate-light 10s linear infinite;
                    }
                    .seal-main {
                        animation: pulse-gold 3s ease-in-out infinite;
                    }
                `}
            </style>

            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Aura de fundo */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/20 to-yellow-500/20 rounded-full blur-2xl seal-main"></div>

                {/* Círculo Rotativo */}
                <svg className="absolute inset-0 w-full h-full seal-outer" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="95" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeDasharray="10 5" />
                    <defs>
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#B8860B', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Selo Central */}
                <div className="w-32 h-32 bg-white rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-amber-400 z-10 p-4 text-center">
                    <i className="fas fa-university text-amber-600 text-3xl mb-1"></i>
                    <span className="text-[10px] font-black text-slate-800 leading-tight uppercase tracking-tighter">Administração Geral Tributária</span>
                    <div className="h-[1px] w-12 bg-amber-200 my-1"></div>
                    <span className="text-[8px] font-bold text-emerald-600 uppercase italic">Software Certificado</span>
                </div>
            </div>

            <p className="text-amber-600 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Compliance Total</p>
        </div>
    );
};

export default AgtSeal;
