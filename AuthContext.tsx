
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { UserProfile, TenantStatusInfo, AuthContextType, UserRole } from './types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenantStatus, setTenantStatus] = useState<TenantStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);

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
        console.warn('AuthContext: No profile found for user', userId);
        setProfile(null);
        return;
      }
      
      setProfile(pData);

      // 2. Fetch Multi-tenant License Status
      if (pData?.tenant_id) {
        const { data: tData, error: tErr } = await supabase
          .from('v_tenant_status')
          .select('*')
          .eq('tenant_id', pData.tenant_id)
          .maybeSingle();

        if (tErr) {
          console.error('License check failed:', tErr);
          // Fallback to active for development if view doesn't exist yet
        }
        setTenantStatus(tData);
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
        // Correctly accessing auth property for getSession
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchData(session.user.id);
        }
      } catch (e) {
        console.error('Session Init Error', e);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Correctly accessing auth property for onAuthStateChange
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) await fetchData(currentUser.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setTenantStatus(null);
      }
      setLoading(false);
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
