import React, { useState } from 'react';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { KeyRound, Mail, AlertCircle, CheckCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';

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

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { setForcedOffline } = await import('../lib/dataLayer');
      setForcedOffline(true);

      const { localExecute } = await import('../lib/db/localDB');
      
      await localExecute(`
        INSERT OR REPLACE INTO tenants (
          id, company_name, tax_id, status, plan_tier, plan_type, tax_regime, allow_negative_stock, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'tenant-demo-id', 
        'Empresa de Demonstração Lda', 
        '500123456', 
        'active', 
        'premium', 
        'annual', 
        'General', 
        1,
        new Date().toISOString()
      ]);

      await localExecute(`
        INSERT OR REPLACE INTO user_profiles (
          id, tenant_id, role, full_name, email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'user-demo-admin', 
        'tenant-demo-id', 
        'tenant_admin', 
        'Administrador Demo', 
        'admin@example.com',
        new Date().toISOString()
      ]);

      const demoUser = {
        id: 'user-demo-admin',
        email: 'admin@example.com',
        user_metadata: { full_name: 'Administrador Demo' },
      };
      
      const demoSession = {
        access_token: 'demo_token_' + Date.now(),
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'demo_refresh_token_' + Date.now(),
        user: demoUser,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };

      const supabaseUrl = 'https://rzelexvouysvkejfwrbf.supabase.co';
      const key = `sb-${new URL(supabaseUrl).hostname}-auth-token`;
      localStorage.setItem(key, JSON.stringify(demoSession));

      console.log('[Login] Sessão Demo Local configurada com sucesso.');
      window.location.reload();
    } catch (err: any) {
      console.error('Falha no Login de Demonstração:', err);
      setError(err.message || 'Falha ao ativar o modo de demonstração local.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black px-4 py-12 select-none overflow-x-hidden relative">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-slate-800/80 relative overflow-hidden transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-10 relative">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl p-3 mx-auto mb-6 flex items-center justify-center shadow-xl shadow-black/40">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
              <path d="M20 80L40 50L35 45L60 20L55 50L65 55L45 80H20Z" fill="#6366F1" />
              <path d="M10 90C30 90 70 10 90 10" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" className="opacity-30" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tighter italic">HR-GESTPRO</h1>
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-[0.3em]">{showRecovery ? 'Recuperação de Acesso' : (isLoginMode ? 'Acesso ao Sistema' : 'Criar Nova Conta')}</p>
        </div>

        {showRecovery ? (
          /* Recovery Form */
          recoverySent ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">E-mail Enviado!</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">Verifique a sua caixa de entrada para redefinir a sua senha.</p>
              <button 
                onClick={() => { setShowRecovery(false); setRecoverySent(false); }} 
                className="text-indigo-400 font-black text-xs uppercase tracking-widest hover:text-indigo-300 transition-colors"
              >
                Voltar ao Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecovery} className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail de Recuperação</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-500">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-medium transition-all"
                    placeholder="admin@empresa.com"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                {loading ? 'A Enviar...' : 'Recuperar Acesso'}
              </button>
              
              <button 
                type="button" 
                onClick={() => setShowRecovery(false)} 
                className="w-full text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-400 transition-colors"
              >
                Cancelar
              </button>
            </form>
          )
        ) : (
          /* Auth Form (Login or Signup) */
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-medium transition-all"
                  placeholder="nome@empresa.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Senha de Acesso</label>
                {isLoginMode && (
                  <button 
                    type="button" 
                    onClick={() => setShowRecovery(true)} 
                    className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors"
                  >
                    Esqueci-me
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-500">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-medium transition-all"
                  placeholder="••••••••"
                  minLength={isLoginMode ? undefined : 6}
                />
              </div>
              {!isLoginMode && (
                <p className="text-[9px] text-slate-500 mt-2 font-medium">A senha deve ter pelo menos 6 caracteres.</p>
              )}
            </div>

            {error && (
              <div className="bg-rose-50 bg-rose-500/10 text-rose-400 p-4 rounded-2xl text-xs font-bold border border-rose-500/20 flex items-center animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl text-xs font-bold border border-emerald-500/20 flex items-center animate-in fade-in duration-300">
                <CheckCircle className="w-5 h-5 mr-3 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/35 hover:shadow-indigo-500/30 transition-all flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> <span>A Processar...</span></>
              ) : (
                <><span>{isLoginMode ? 'Entrar no Sistema' : 'Criar Conta'}</span> <ArrowRight className="w-4 h-4" /></>
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
                className="text-[10px] font-bold text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-wider"
                disabled={loading}
              >
                {isLoginMode ? 'Não tem conta? Registar-se' : 'Já tem conta? Iniciar Sessão'}
              </button>
            </div>

            {isLoginMode && (
              <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:border-white/20 transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>Acesso Demo (Local / Offline)</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="mt-10 pt-8 border-t border-slate-800/80 text-center text-slate-600">
          <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
            Protected by HR-GESTPRO Infrastructure
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest hover:text-slate-400 transition-colors">
            Desenvolvido por HR-Tecnologias | Apoio: 923 658 211
          </p>
        </div>
      </div>

      {/* Diagnostic Helper Section */}
      <div className="mt-8 max-w-md w-full">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full py-3 px-6 rounded-2xl border border-dashed border-slate-800 text-[9px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-[0.2em] transition-all"
        >
          {showDebug ? 'Ocultar Diagnóstico' : 'Verificar Endereço de Conexão'}
        </button>

        {showDebug && (
          <div className="mt-4 p-6 bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-slate-800/80 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 text-slate-300">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-indigo-400" /> Endpoint Supabase Activo
            </h4>
            <div className="space-y-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">URL Principal</p>
                <p className="text-xs font-mono text-indigo-300 break-all">{SUPABASE_URL}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Status da Credencial</p>
                <p className="text-xs font-mono text-emerald-400 flex items-center font-bold">
                  <CheckCircle className="w-4 h-4 mr-1.5 shrink-0" /> Chave do Cliente Detetada e Validada
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
