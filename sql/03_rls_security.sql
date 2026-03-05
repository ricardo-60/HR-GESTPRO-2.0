-- =========================================================================================
-- HR-GESTPRO 2.0: POLÍTICAS DE 'ROW LEVEL SECURITY' (B2B SaaS ISOLATION)
-- =========================================================================================

-- Tabela: INVOICES
-- 1. Ativar o RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar Políticas Anteriores Padrão (Se Existirem)
DROP POLICY IF EXISTS "Permitir SELECT apenas ao próprio inquilino" ON public.invoices;
DROP POLICY IF EXISTS "Permitir INSERT apenas ao próprio inquilino" ON public.invoices;

-- 3. Criar Políticas Restritas Baseadas no auth.uid()
-- Os Utilizadores só podem ver as faturas em que a empresa deles (tenant_id) corresponda
-- à empresa onde o Auth.UID deles está registado (na tabela profiles/users).

CREATE POLICY "invoices_isolation_policy_select" 
ON public.invoices 
FOR SELECT 
USING (
    tenant_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "invoices_isolation_policy_insert" 
ON public.invoices 
FOR INSERT 
WITH CHECK (
    tenant_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    )
);


-- =========================================================================================
-- Tabela: COMPANIES (TENANTS)
-- =========================================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_own_only" 
ON public.tenants 
FOR SELECT 
USING (
    id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    )
);

-- Utilizadores comuns nunca devem fazer UPDATE ou DELETE aos Tenants. Apenas o Master.
-- =========================================================================================
