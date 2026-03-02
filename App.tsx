
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserRole, TenantStatus } from './types';
import { checkSupabaseConfig, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import CompanyManagement from './pages/CompanyManagement';
import SalesManagement from './pages/SalesManagement';
import HRManagement from './pages/HRManagement';
import Layout from './components/Layout';

/**
 * MainRouter: Core SPA Navigation Logic.
 */
const MainRouter: React.FC = () => {
  const { role } = useAuth();
  const [currentPath, setCurrentPath] = useState('dashboard');

  const renderContent = () => {
    // Access Guards
    if (currentPath === 'users' && (role === UserRole.ADMIN || role === UserRole.MASTER)) {
      return <UserManagement />;
    }

    if (currentPath === 'companies' && (role === UserRole.ADMIN || role === UserRole.MASTER)) {
      return <CompanyManagement />;
    }

    switch (currentPath) {
      case 'dashboard':
        if (role === UserRole.MASTER) return <Dashboard variant="master" />;
        if (role === UserRole.RH) return <Dashboard variant="rh" />;
        if (role === UserRole.FINANCE) return <Dashboard variant="finance" />;
        if (role === UserRole.SALES) return <SalesManagement />;
        return <Dashboard variant="admin" />;
      case 'rh':
        return <HRManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'finance':
        return <Dashboard variant="finance" />;
      case 'settings':
        return <Dashboard variant="admin" />;
      default:
        return <Dashboard variant="admin" />;
    }
  };

  return (
    <Layout currentPath={currentPath} onNavigate={setCurrentPath}>
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
        {renderContent()}
      </div>
    </Layout>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, tenantStatus, loading, signOut } = useAuth();

  if (!checkSupabaseConfig()) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
        <div className="max-w-md bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <h1 className="text-white text-2xl font-black mb-4 tracking-tight uppercase italic">HR-GESTPRO 2.0</h1>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Credenciais de API não detetadas ou inválidas. Verifique os dados abaixo:
          </p>

          <div className="space-y-3">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">URL Detetada</p>
              <p className="text-xs font-mono text-indigo-300 truncate">{SUPABASE_URL || 'NÃO DEFINIDA'}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Key Detetada</p>
              <p className="text-xs font-mono text-indigo-300 truncate">
                {SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 10)}...` : 'NÃO DEFINIDA'}
              </p>
            </div>
          </div>

          <p className="mt-8 text-[10px] text-slate-500 uppercase font-black tracking-widest">Aguardando Configuração</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="mt-10 text-center">
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] mb-4">HR-GESTPRO PROD</p>
          <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 inline-block">
            <p className="text-[9px] text-slate-400 font-mono">Endpoint: {SUPABASE_URL}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (tenantStatus?.status === TenantStatus.EXPIRED) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center">
          <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl">
            <i className="fas fa-credit-card"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Licença Expirada</h2>
          <p className="text-slate-500 mb-10 leading-relaxed">
            A conta associada a <span className="font-bold text-slate-800">{tenantStatus.company_name}</span> encontra-se suspensa.
          </p>
          <div className="space-y-4">
            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all">
              Renovar Agora
            </button>
            <button onClick={() => signOut()} className="w-full text-slate-400 font-bold py-2 hover:text-slate-600 transition-all text-xs tracking-widest uppercase">
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
          <i className="fas fa-fingerprint text-2xl"></i>
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">A Sincronizar...</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-8">Estamos a preparar o seu ambiente de trabalho multitenant.</p>

        <button
          onClick={() => signOut()}
          className="text-gray-400 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-widest transition-colors"
        >
          Sair da Conta e Tentar Novamente
        </button>
      </div>
    );
  }

  return <MainRouter />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
