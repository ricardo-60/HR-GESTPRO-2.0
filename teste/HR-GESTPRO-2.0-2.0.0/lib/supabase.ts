
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * HR-GESTPRO-2.0 Environment Variable Strategy
 */
const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env[`NEXT_PUBLIC_${key}`] || 
      process.env[`VITE_${key}`] || 
      process.env[key] || 
      fallback
    );
  }
  return fallback;
};

// Configuração centralizada das credenciais do projeto rzelexvouysvkejfwrbf
export const SUPABASE_URL = getEnv('SUPABASE_URL', 'https://rzelexvouysvkejfwrbf.supabase.co');

export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', 
  getEnv('SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'sb_publishable_gnUwh9zzxTvPC_1gbCHZzw_iZX4tY-r')
);

const isConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL !== '' && 
  !SUPABASE_ANON_KEY.includes('your_')
);

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }) 
  : (null as unknown as SupabaseClient);

/**
 * Utilitário para verificar a prontidão do sistema.
 */
export const checkSupabaseConfig = () => isConfigured;
