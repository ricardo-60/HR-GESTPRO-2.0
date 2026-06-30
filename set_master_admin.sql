-- ==============================================================================
-- SCRIPT: CRIAR USUÁRIO MASTER ADMIN NO SUPABASE
-- Executar este script no SQL Editor do Supabase
-- ==============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_email TEXT := 'hermenegildo.ricardo@gmail.com';
    v_password TEXT := 'klb12kl60@@'; 
    -- NOTA: O Supabase gere senhas no Auth, por isso é fortemente recomendado 
    -- criar a conta via interface da aplicação e usar este script apenas para 
    -- dar a permissão de "master_admin" e associar ao tenant principal.
BEGIN
    -- 1. Obter ou criar um Tenant Principal (Empresa)
    SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (company_name, tax_id, status, plan_tier)
        VALUES ('HR Tecnologias (Master)', '000000000', 'active', 'Premium')
        RETURNING id INTO v_tenant_id;
    END IF;

    -- 2. Procurar o utilizador na tabela do Supabase Auth (auth.users)
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- 3. Inserir ou atualizar o perfil do utilizador para ser master_admin
        INSERT INTO public.user_profiles (id, tenant_id, role, email, full_name, is_active)
        VALUES (v_user_id, v_tenant_id, 'master_admin', v_email, 'Hermenegildo Ricardo', true)
        ON CONFLICT (id) DO UPDATE 
        SET tenant_id = v_tenant_id, 
            role = 'master_admin',
            is_active = true;
            
        RAISE NOTICE 'Utilizador % atualizado para master_admin!', v_email;
    ELSE
        RAISE EXCEPTION 'Utilizador % não encontrado em auth.users. Crie a conta primeiro na página de Login da aplicação usando o email % e a senha %.', v_email, v_email, v_password;
    END IF;
END $$;
