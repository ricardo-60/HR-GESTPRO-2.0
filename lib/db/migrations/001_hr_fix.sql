-- ==============================================================================
-- MIGRAÇÃO DE COMPATIBILIDADE DE RECURSOS HUMANOS (SUPABASE / POSTGRESQL)
-- Alinha o schema do Supabase Cloud com as necessidades do front-end React
-- e adiciona as tabelas faltantes de assiduidade e folhas salariais.
-- ==============================================================================

-- 1. ADICIONAR COLUNAS DE COMPATIBILIDADE E ALIASES NA TABELA employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Remover restrição unique em email se existir (email pode ser nulo ou repetir em diferentes tenants)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_key;

-- 2. CRIAR FUNÇÃO E TRIGGER DE SINCRONIZAÇÃO BIDIRECIONAL DE CAMPOS
CREATE OR REPLACE FUNCTION sync_employee_fields_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar full_name -> first_name / last_name
    IF NEW.full_name IS NOT NULL AND NEW.full_name <> '' THEN
        IF NEW.first_name IS NULL OR NEW.first_name = '' OR TG_OP = 'INSERT' THEN
            -- Divide no primeiro espaço
            NEW.first_name := split_part(NEW.full_name, ' ', 1);
            IF position(' ' in NEW.full_name) > 0 THEN
                NEW.last_name := substring(NEW.full_name from position(' ' in NEW.full_name) + 1);
            ELSE
                NEW.last_name := '';
            END IF;
        END IF;
    -- Sincronizar first_name + last_name -> full_name
    ELSIF (NEW.first_name IS NOT NULL AND NEW.first_name <> '') THEN
        NEW.full_name := NEW.first_name || COALESCE(' ' || NEW.last_name, '');
    END IF;

    -- Sincronizar aliases de email
    IF NEW.contact_email IS NOT NULL AND NEW.contact_email <> '' THEN
        NEW.email := NEW.contact_email;
    ELSIF NEW.email IS NOT NULL AND NEW.email <> '' THEN
        NEW.contact_email := NEW.email;
    END IF;

    -- Sincronizar aliases de telefone
    IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
        NEW.phone := NEW.contact_phone;
    ELSIF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
        NEW.contact_phone := NEW.phone;
    END IF;

    -- Sincronizar aliases de cargo (role / job_title)
    IF NEW.role IS NOT NULL AND NEW.role <> '' THEN
        NEW.job_title := NEW.role;
    ELSIF NEW.job_title IS NOT NULL AND NEW.job_title <> '' THEN
        NEW.role := NEW.job_title;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger de compatibilidade
DROP TRIGGER IF EXISTS trg_sync_employee_fields ON employees;
CREATE TRIGGER trg_sync_employee_fields
BEFORE INSERT OR UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION sync_employee_fields_trigger();

-- 3. CRIAR TABELA DE REGISTO DE ASSIDUIDADE (attendance_logs)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'present' NOT NULL CHECK(status IN ('present', 'absent', 'on_leave', 'late')),
    check_in TIME,
    check_out TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance_logs(tenant_id, date);

-- Trigger de data de modificação para attendance_logs
DROP TRIGGER IF EXISTS update_attendance_logs_modtime ON attendance_logs;
CREATE TRIGGER update_attendance_logs_modtime
BEFORE UPDATE ON attendance_logs
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 4. CRIAR TABELA DE REGAISTOS DE FOLHA DE SALÁRIO (payroll_records)
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK(period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK(period_year > 2000),
    gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK(gross_pay >= 0),
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK(net_pay >= 0),
    inss_employee NUMERIC(12, 2) DEFAULT 0,
    inss_employer NUMERIC(12, 2) DEFAULT 0,
    irt NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL CHECK(status IN ('draft', 'processed', 'paid')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(employee_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_records(tenant_id);

-- Trigger de data de modificação para payroll_records
DROP TRIGGER IF EXISTS update_payroll_records_modtime ON payroll_records;
CREATE TRIGGER update_payroll_records_modtime
BEFORE UPDATE ON payroll_records
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
