
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserRole, TenantStatus } from './types';
import { checkSupabaseConfig, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Usando React.lazy apenas para módulos secundários pesados (Code Splitting Otimizado)
const UserManagement = lazy(() => import('./pages/UserManagement'));
const CompanyManagement = lazy(() => import('./pages/CompanyManagement'));
const SalesManagement = lazy(() => import('./pages/SalesManagement'));
const HRManagement = lazy(() => import('./pages/HRManagement'));
const ExpiredLicense = lazy(() => import('./pages/ExpiredLicense'));
const MasterSettings = lazy(() => import('./pages/MasterSettings'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const Reports = lazy(() => import('./pages/Reports'));
const SaftExport = lazy(() => import('./pages/SaftExport'));
const KeyManagement = lazy(() => import('./pages/KeyManagement'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));

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
      case 'purchases':
        return <PurchaseOrders />;
      case 'suppliers':
        return <Suppliers />;
      case 'reports':
        return <Reports />;
      case 'saft':
        return <SaftExport />;
      case 'keys':
        return <KeyManagement />;
      case 'settings':
        if (role === UserRole.MASTER) return <MasterSettings />;
        return <Dashboard variant="admin" />;
      case 'help':
        return <HelpCenter />;
      default:
        return <Dashboard variant="admin" />;
    }
  };

  // Componente de Loading Interativo para as transições
  const PageLoader = () => (
    <div className="w-full h-96 flex flex-col items-center justify-center opacity-50">
      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">A carregar módulo...</p>
    </div>
  );

  return (
    <Layout currentPath={currentPath} onNavigate={setCurrentPath}>
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
        <Suspense fallback={<PageLoader />}>
          {renderContent()}
        </Suspense>
      </div>
    </Layout>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, tenantStatus, loading, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  // Wake-up Check: Re-validate session when window regains focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('[Wake-Up] App visível, a validar sessão...');
        const { data, error } = await (await import('./lib/supabase')).supabase.auth.getSession();
        if (error || !data.session) {
          console.warn('[Wake-Up] Sessão expirada ou inválida, a redirecionar...');
          window.location.reload();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

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
    return <LoadingScreen />;
  }

  if (!user) {
    // Mostrar Landing Page como ecrã inicial, com opção de ir para Login
    if (!showLogin) {
      return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
          <LandingPage onLogin={() => setShowLogin(true)} />
        </Suspense>
      );
    }
    return <Login />;
  }

  if (tenantStatus?.status === TenantStatus.EXPIRED || tenantStatus?.status === TenantStatus.SUSPENDED) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <ExpiredLicense />
      </Suspense>
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

  return (
    <Suspense fallback={<LoadingScreen />}>
      <MainRouter />
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
