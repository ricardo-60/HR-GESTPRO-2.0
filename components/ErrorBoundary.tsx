import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('CRITICAL: Uncaught react error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md w-full">
                        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
                            <i className="fas fa-exclamation-triangle text-3xl text-rose-500 animate-pulse"></i>
                        </div>
                        <h1 className="text-white text-2xl font-black mb-4 tracking-tight uppercase">Oops! Algo correu mal</h1>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            Ocorreu um erro inesperado na interface. Isto pode dever-se a uma falha de sincronização de dados ou um problema técnico temporário.
                        </p>

                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 mb-8 text-left overflow-auto max-h-40 custom-scrollbar">
                            <p className="text-[10px] font-mono text-rose-400 opacity-80 break-all">
                                {this.state.error?.toString()}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40"
                            >
                                Recarregar Sistema
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Voltar ao Inicio
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
