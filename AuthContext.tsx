
import React, { createContext, useContext, useEffect, useState } from 'react';
import { dataLayer as supabase } from './lib/dataLayer';
import { UserProfile, TenantStatusInfo, AuthContextType, UserRole } from './types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenantStatus, setTenantStatus] = useState<TenantStatusInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Safety Timeout: Force stop loading after 3 seconds (v2.1.6 Emergency)
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('CRITICAL: Auth initialization timeout (10s). Forcing UI unlock.');
        setLoading(false);
        if (user && !profile) {
          setError('A sincronização do perfil está demorada. Poderá haver lentidão em módulos de RH.');
        } else if (!user && !error) {
          setError('O carregamento está a demorar mais do que o esperado. Verifique a sua ligação.');
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile, error]);

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
          .select('id, company_name, status, trial_end_date, license_expires_at, plan_type, tax_regime, allow_negative_stock, tax_id, address, phone, logo_url')
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

          const hasIva = tData.tax_regime === 'General';
          setTenantStatus({
            tenant_id: tData.id,
            company_name: tData.company_name,
            status: computedStatus,
            trial_end_date: tData.trial_end_date,
            license_expires_at: tData.license_expires_at,
            plan_type: tData.plan_type,
            tax_regime: tData.tax_regime as any,
            allow_negative_stock: tData.allow_negative_stock,
            is_iva_enabled: hasIva,
            tax_id: tData.tax_id || '',
            address: tData.address || '',
            phone: tData.phone || '',
            logo_url: tData.logo_url || ''
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
        setLoading(true);
        const response = await supabase.auth.getSession();
        if (response && response.data && response.data.session) {
          const session = response.data.session;
          if (session?.user) {
            setUser(session.user);
            await fetchData(session.user.id);
          }
        }
      } catch (e) {
        console.error('Session Init Error - CRITICAL UI AVOIDANCE:', e);
        setError('Erro crítico ao carregar autenticação. Por favor, tente recarregar a página.');
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Evento: ${event}`);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setLoading(true); // Re-ativa loading ao atualizar dados
          await fetchData(currentUser.id);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setLoading(true);
        setUser(null);
        setProfile(null);
        setTenantStatus(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
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
