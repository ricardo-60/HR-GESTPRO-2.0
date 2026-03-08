
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { UserProfile, TenantStatusInfo, AuthContextType, UserRole } from './types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenantStatus, setTenantStatus] = useState<TenantStatusInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Safety Timeout: Force stop loading after 5 seconds
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('CRITICAL: Auth initialization timeout (5s). Forcing UI unlock.');
        setLoading(false);
        if (!user && !error) {
          setError('O carregamento está a demorar mais do que o esperado. Verifique a sua ligação ou tente novamente.');
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, error]);

  const fetchData = async (userId: string) => {
    if (!supabase) return;
    try {
      // 1. Fetch User Profile from Public Schema
      const { data: pData, error: pErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Better than .single() for new users without profile

      if (pErr) throw pErr;

      if (!pData) {
        console.error('CRITICAL: No profile found for authenticated user', userId);
        setError('O seu perfil não foi encontrado. Contacte o suporte.');
        setProfile(null);
        return;
      }

      setProfile(pData);

      // 2. Fetch Multi-tenant License Status
      if (pData?.tenant_id) {
        const { data: tData, error: tErr } = await supabase
          .from('tenants')
          .select('id, company_name, status, trial_end_date, license_expires_at, plan_type, tax_regime, allow_negative_stock')
          .eq('id', pData.tenant_id)
          .maybeSingle();

        if (tErr) {
          console.error('License check failed:', tErr);
        }

        if (tData) {
          let computedStatus = tData.status;

          // 1. Verificar Expiração (Trial ou Licença Paga)
          // Prioridade para license_expires_at, se nula usa trial_end_date
          const expiryDate = tData.license_expires_at || tData.trial_end_date;

          if (expiryDate) {
            const isExpired = new Date() > new Date(expiryDate);
            if (isExpired) {
              computedStatus = 'expired';
            }
          }

          setTenantStatus({
            tenant_id: tData.id,
            company_name: tData.company_name,
            status: computedStatus,
            trial_end_date: tData.trial_end_date,
            license_expires_at: tData.license_expires_at,
            plan_type: tData.plan_type,
            tax_regime: tData.tax_regime as any,
            allow_negative_stock: tData.allow_negative_stock
          });
        } else {
          setTenantStatus(null);
        }
      }
    } catch (err) {
      console.error('RBAC Initialization Error:', err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // 1. Carregamento Faseado: Carrega o essencial agora, deferimos o resto por 50ms 
          // para deixar o browser respirar e mostrar a UI/LoadingScreen
          setTimeout(() => {
            fetchData(session.user.id);
          }, 50);
        }
      } catch (e) {
        console.error('Session Init Error', e);
      } finally {
        // Libertamos o loading principal rápido para mostrar o esqueleto/dashboard
        setLoading(false);
      }
    };

    init();

    // Correctly accessing auth property for onAuthStateChange
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Evento: ${event}`);
      setLoading(true);

      try {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            await fetchData(currentUser.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setTenantStatus(null);
          setError(null);
        }
      } catch (err) {
        console.error('[Auth] Erro no listener:', err);
        setError('Ocorreu um erro ao atualizar a sua sessão.');
      } finally {
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    try {
      // Correctly accessing auth property for signOut
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error', e);
      // Fallback: reload page to clear state
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role: profile?.role || null,
      tenantId: profile?.tenant_id || null,
      tenantStatus,
      error,
      loading,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
