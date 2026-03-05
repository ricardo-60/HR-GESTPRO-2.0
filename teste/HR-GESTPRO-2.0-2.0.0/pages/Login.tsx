
import React, { useState } from 'react';
import { supabase, SUPABASE_URL } from '../lib/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMessage('Registo efetuado com sucesso! Verifique a sua caixa de entrada.');
        // Opcional: alternar de volta para login após registo
        // setIsLoginMode(true);
      }
    } catch (err: any) {
      setError(err.message || (isLoginMode ? 'Erro ao realizar login.' : 'Erro ao realizar o registo.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setRecoverySent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 relative overflow-hidden">
        {/* Decorative Element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 opacity-50"></div>

        <div className="text-center mb-10 relative">
          <h1 className="text-4xl font-black text-indigo-600 mb-2 tracking-tighter italic">HR-GESTPRO-2.0</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">{showRecovery ? 'Recuperação de Acesso' : (isLoginMode ? 'Enterprise Access' : 'Create Account')}</p>
        </div>

        {showRecovery ? (
          /* Recovery Form */
          recoverySent ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-paper-plane text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">E-mail Enviado!</h3>
              <p className="text-gray-500 text-sm mb-8">Verifique a sua caixa de entrada para redefinir a senha.</p>
              <button onClick={() => { setShowRecovery(false); setRecoverySent(false); }} className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">
                Voltar ao Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecovery} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">E-mail de Recuperação</label>
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-0 focus:ring-2 focus:ring-indigo-500 transition outline-none font-medium"
                  placeholder="admin@empresa.com"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                {loading ? 'A Enviar...' : 'Recuperar Acesso'}
              </button>
              <button type="button" onClick={() => setShowRecovery(false)} className="w-full text-gray-400 font-bold text-xs uppercase tracking-widest">
                Cancelar
              </button>
            </form>
          )
        ) : (
          /* Auth Form (Login or Signup) */
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Credencial de E-mail</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-gray-300">
                  <i className="fas fa-at"></i>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 border-0 focus:ring-2 focus:ring-indigo-500 transition outline-none font-medium"
                  placeholder="nome@empresa.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senha de Acesso</label>
                {isLoginMode && (
                  <button type="button" onClick={() => setShowRecovery(true)} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700">
                    Esqueci-me
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-gray-300">
                  <i className="fas fa-key"></i>
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 border-0 focus:ring-2 focus:ring-indigo-500 transition outline-none font-medium"
                  placeholder="••••••••"
                  minLength={isLoginMode ? undefined : 6}
                />
              </div>
              {!isLoginMode && (
                <p className="text-[9px] text-gray-400 mt-2 font-medium">A senha deve ter pelo menos 6 caracteres.</p>
              )}
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 flex items-center">
                <i className="fas fa-circle-exclamation mr-3 text-lg"></i>
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold border border-emerald-100 flex items-center">
                <i className="fas fa-check-circle mr-3 text-lg"></i>
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black shadow-xl shadow-slate-200 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <><i className="fas fa-circle-notch fa-spin"></i> <span>A Processar...</span></>
              ) : (
                <><span>{isLoginMode ? 'Entrar no Sistema' : 'Criar Conta'}</span> <i className={`fas ${isLoginMode ? 'fa-arrow-right' : 'fa-user-plus'}`}></i></>
              )}
            </button>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[11px] font-bold text-gray-500 hover:text-indigo-600 transition-colors"
                disabled={loading}
              >
                {isLoginMode ? 'Não tem conta? Registar-se' : 'Já tem conta? Iniciar Sessão'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-10 pt-8 border-t border-gray-50 text-center">
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest mb-2">
            Protected by HR-GESTPRO Infrastructure
          </p>
          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
            Desenvolvido por HR- Tecnologias | Contacto: 923658211
          </p>
        </div>
      </div>

      {/* Diagnostic Helper Section */}
      <div className="mt-8 max-w-md w-full">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full py-3 px-6 rounded-2xl border border-dashed border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:bg-white hover:text-indigo-500 transition-all"
        >
          {showDebug ? 'Ocultar Diagnóstico' : 'Verificar Variáveis de Conexão'}
        </button>

        {showDebug && (
          <div className="mt-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
              <i className="fas fa-terminal mr-2 text-indigo-500"></i> Painel de Ligação
            </h4>
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Supabase Endpoint</p>
                <p className="text-[11px] font-mono text-slate-700 break-all">{SUPABASE_URL}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Status da Chave</p>
                <p className="text-[11px] font-mono text-emerald-600 flex items-center">
                  <i className="fas fa-check-circle mr-1.5"></i> Chave Publishable Detetada
                </p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <p className="text-[9px] font-bold text-indigo-400 uppercase mb-1">Dica de Acesso</p>
                <p className="text-[10px] text-indigo-900 font-medium leading-relaxed">
                  Utilize o e-mail e senha criados no painel <b>Authentication</b> do seu projeto Supabase.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
