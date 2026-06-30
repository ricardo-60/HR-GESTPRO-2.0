import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o estado para que o próximo render mostre a UI de fallback.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Capturado um erro não tratado no React:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-slate-950 rounded-[2.5rem] border border-gray-100 dark:border-slate-900 transition-colors duration-300">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
            <i className="fas fa-exclamation-triangle text-2xl"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white mb-2">Algo correu mal</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md leading-relaxed mb-6">
            Ocorreu um erro inesperado ao carregar este módulo. Não se preocupe, os seus dados locais continuam seguros no SQLite.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all shadow-md active:scale-95"
            >
              Recarregar Aplicação
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all border border-gray-200 dark:border-slate-700 active:scale-95"
            >
              Tentar Novamente
            </button>
          </div>
          {this.state.error && (
            <div className="mt-8 p-4 bg-slate-950/80 dark:bg-slate-950 rounded-2xl max-w-lg w-full text-left border border-slate-900 overflow-x-auto">
              <p className="text-[10px] font-bold text-rose-400 font-mono">Detalhes do Erro:</p>
              <pre className="text-[10px] font-mono text-slate-500 mt-2 whitespace-pre-wrap">
                {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
