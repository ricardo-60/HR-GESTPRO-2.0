-- Habilitar a extensão pgcrypto para geração de UUIDs (se ainda não estiver ativa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Criação dos Tipos Enums (Tipos Personalizados)
-- Evita erros no caso de já existirem, usamos um bloco DO
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('master_admin', 'tenant_admin', 'hr_user', 'finance_user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Criação das Tabelas

-- Tabela: tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    status tenant_status NOT NULL DEFAULT 'active',
    plan_tier TEXT NOT NULL DEFAULT 'Basic',
    contact_email TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'hr_user',
    full_name TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Configuração de RLS (Row Level Security)

-- Ativar RLS nas tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar duplicados ao correr novamente o script
DROP POLICY IF EXISTS "Master admin can interact with all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their own tenant profile" ON tenants;
DROP POLICY IF EXISTS "Master admin can view and update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Tenant users can view profiles within the same tenant" ON user_profiles;
DROP POLICY IF EXISTS "Tenant admins can modify profiles within their tenant" ON user_profiles;

-- -------- POLÍTICAS PARA TENANTS -------- --

-- O master_admin tem acesso global a todas as empresas
CREATE POLICY "Master admin can interact with all tenants" 
    ON tenants FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'master_admin'
        )
    );

-- Os restantes utilizadores só podem visualizar as empresas às quais pertencem
CREATE POLICY "Users can view their own tenant profile" 
    ON tenants FOR SELECT 
    USING (
        id IN (
            SELECT tenant_id FROM user_profiles
            WHERE user_profiles.id = auth.uid()
        )
    );

-- -------- POLÍTICAS PARA USER_PROFILES -------- --

-- O master_admin tem acesso global aos profiles
CREATE POLICY "Master admin can view and update all profiles" 
    ON user_profiles FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'master_admin'
        )
    );

-- Utilizadores podem visualizar perfis da mesma empresa
CREATE POLICY "Tenant users can view profiles within the same tenant" 
    ON user_profiles FOR SELECT 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_profiles
            WHERE user_profiles.id = auth.uid()
        )
    );

-- Administrador de Empresa (Tenant Admin) pode gerir perfis da própria empresa
CREATE POLICY "Tenant admins can modify profiles within their tenant" 
    ON user_profiles FOR ALL 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'tenant_admin'
        )
    );

-- Utilizadores comuns podem ler e editar (UPDATE) o próprio perfil
CREATE POLICY "Users can view and update their own profile" 
    ON user_profiles FOR UPDATE 
    USING ( id = auth.uid() );

-- -------- Função para auto-criar o perfil após registo no Auth (Trigger Opcional) -------- --
-- Quando um novo user é criado no supabase auth ("auth.users"), você pode querer garantir que um perfil é pré-criado
/*
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Isso criará um perfil em branco, que pode ser atualizado mais tarde. 
    -- Podes querer adaptar isto consoante o fluxo do teu frontend!
    INSERT INTO public.user_profiles (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
*/
