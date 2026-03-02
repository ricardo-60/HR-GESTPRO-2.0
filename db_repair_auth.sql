-- ==============================================================================
-- SCRIPT DE REPARAÇÃO: CORE AUTH & MULTI-TENANCY
-- Este script garante que a conta "Master" e a estrutura base estão funcionais.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS CORE (Se não existirem)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    plan_tier TEXT NOT NULL DEFAULT 'Basic',
    contact_email TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('master_admin', 'tenant_admin', 'hr_user', 'finance_user', 'sales_user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'hr_user',
    full_name TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. VISTA DE STATUS (Necessária para o AuthContext.tsx)
CREATE OR REPLACE VIEW v_tenant_status AS
SELECT 
    id as tenant_id,
    status,
    company_name
FROM tenants;

-- 4. REPARAÇÃO AUTOMÁTICA DO SEU PROFILE
-- Este bloco tenta associar o seu utilizador atual (se logado no SQL Editor) a uma empresa padrão
DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Verificar se existe uma empresa, se não, criar uma "Empresa Detalhe"
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (company_name, tax_id, status)
        VALUES ('Minha Empresa SaaS', '500123456', 'active')
        RETURNING id INTO v_tenant_id;
    END IF;

    -- Tentar encontrar o seu ID (isto funciona melhor se correr no SQL Editor do Supabase autenticado)
    -- Se não encontrar, o script não falha.
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, role, email, full_name)
        VALUES (v_user_id, v_tenant_id, 'master_admin', (SELECT email FROM auth.users WHERE id = v_user_id), 'Administrador')
        ON CONFLICT (id) DO UPDATE 
        SET tenant_id = v_tenant_id, role = 'master_admin';
    END IF;
END $$;

-- 5. REATIVAR RLS (Segurança)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Garantir acesso ao próprio perfil
DROP POLICY IF EXISTS "Users can view and update their own profile" ON user_profiles;
CREATE POLICY "Users can view and update their own profile" 
    ON user_profiles FOR ALL 
    USING (id = auth.uid());

-- Garantir acesso ao próprio tenant
DROP POLICY IF EXISTS "Users can view their own tenant profile" ON tenants;
CREATE POLICY "Users can view their own tenant profile" 
    ON tenants FOR SELECT 
    USING (id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
