-- ==============================================================================
-- HR-GESTPRO 2.0 — SCHEMA SQLite LOCAL
-- Base de dados local para modo offline/rede interna
-- Compatível com o schema Supabase Cloud
-- Versão: 2.2.0
-- ==============================================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ==============================================================================
-- TABELA: tenants
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    tax_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('trial','active','expired','suspended')),
    plan_tier TEXT DEFAULT 'basic',
    plan_type TEXT,
    tax_regime TEXT CHECK(tax_regime IN ('Exclusion','General')),
    allow_negative_stock INTEGER DEFAULT 0,
    logo_url TEXT,
    contact_email TEXT,
    address TEXT,
    phone TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_iban TEXT,
    trial_start_date TEXT,
    trial_end_date TEXT,
    license_expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced' CHECK(sync_status IN ('synced','pending','conflict'))
);

-- ==============================================================================
-- TABELA: user_profiles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'sales_user',
    full_name TEXT,
    email TEXT,
    can_close_sales INTEGER DEFAULT 0,
    -- Campos de autenticação offline segura (v2.2.3)
    password_hash TEXT,
    password_salt TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);

-- ==============================================================================
-- MÓDULO: RECURSOS HUMANOS
-- ==============================================================================

-- Tabela de departamentos
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);

-- Tabela de funcionários (schema unificado)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    -- Campos de identidade (unificados para compatibilidade com o React)
    full_name TEXT NOT NULL,         -- Campo principal no React
    first_name TEXT,                  -- Derivado de full_name para sync com cloud
    last_name TEXT,                   -- Derivado de full_name para sync com cloud
    id_card TEXT,                     -- Número BI/Passaporte
    nif TEXT,
    inss TEXT,
    iban TEXT,
    birth_date TEXT,
    -- Cargo/Função
    role TEXT,                        -- Campo no React (alias de job_title)
    job_title TEXT,                   -- Campo na cloud Supabase
    -- Dados de contacto
    contact_email TEXT,               -- Campo no React (alias de email)
    email TEXT,                       -- Campo na cloud Supabase
    contact_phone TEXT,               -- Campo no React (alias de phone)
    phone TEXT,                       -- Campo na cloud Supabase
    -- Dados laborais
    base_salary REAL NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'AOA',
    hire_date TEXT NOT NULL DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','on_leave','inactive','terminated')),
    -- Timestamps e sync
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced' CHECK(sync_status IN ('synced','pending','conflict'))
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(tenant_id, status);

-- Trigger para manter first_name/last_name sincronizados com full_name
CREATE TRIGGER IF NOT EXISTS trg_employees_split_name_insert
AFTER INSERT ON employees
WHEN NEW.first_name IS NULL AND NEW.full_name IS NOT NULL
BEGIN
    UPDATE employees
    SET
        first_name = CASE
            WHEN INSTR(NEW.full_name, ' ') > 0
            THEN SUBSTR(NEW.full_name, 1, INSTR(NEW.full_name, ' ') - 1)
            ELSE NEW.full_name
        END,
        last_name = CASE
            WHEN INSTR(NEW.full_name, ' ') > 0
            THEN SUBSTR(NEW.full_name, INSTR(NEW.full_name, ' ') + 1)
            ELSE ''
        END,
        email = COALESCE(NEW.contact_email, NEW.email),
        phone = COALESCE(NEW.contact_phone, NEW.phone),
        job_title = COALESCE(NEW.role, NEW.job_title),
        contact_email = COALESCE(NEW.contact_email, NEW.email),
        contact_phone = COALESCE(NEW.contact_phone, NEW.phone),
        role = COALESCE(NEW.role, NEW.job_title)
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_employees_split_name_update
AFTER UPDATE OF full_name, contact_email, contact_phone, role ON employees
BEGIN
    UPDATE employees
    SET
        first_name = CASE
            WHEN INSTR(NEW.full_name, ' ') > 0
            THEN SUBSTR(NEW.full_name, 1, INSTR(NEW.full_name, ' ') - 1)
            ELSE NEW.full_name
        END,
        last_name = CASE
            WHEN INSTR(NEW.full_name, ' ') > 0
            THEN SUBSTR(NEW.full_name, INSTR(NEW.full_name, ' ') + 1)
            ELSE ''
        END,
        email = COALESCE(NEW.contact_email, NEW.email),
        phone = COALESCE(NEW.contact_phone, NEW.phone),
        job_title = COALESCE(NEW.role, NEW.job_title),
        updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Registo de assiduidade
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','on_leave','late')),
    check_in TEXT,
    check_out TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance_logs(tenant_id, date);

-- Registos de folha de salário
CREATE TABLE IF NOT EXISTS payroll_records (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK(period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK(period_year > 2000),
    gross_pay REAL NOT NULL DEFAULT 0 CHECK(gross_pay >= 0),
    net_pay REAL NOT NULL DEFAULT 0 CHECK(net_pay >= 0),
    inss_employee REAL DEFAULT 0,
    inss_employer REAL DEFAULT 0,
    irt REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','processed','paid')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    UNIQUE(employee_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_records(tenant_id);

-- ==============================================================================
-- MÓDULO: PRODUTOS E STOCK
-- ==============================================================================
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    unit_price REAL NOT NULL DEFAULT 0 CHECK(unit_price >= 0),
    cost_price REAL DEFAULT 0,
    average_cost REAL DEFAULT 0,
    stock_current INTEGER DEFAULT 0,
    stock_min INTEGER DEFAULT 0,
    stock_max INTEGER DEFAULT 9999,
    is_active INTEGER DEFAULT 1,
    is_exempt INTEGER DEFAULT 0,
    exemption_reason TEXT,
    image_url TEXT,
    category TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(tenant_id, is_active);

-- Log de inventário
CREATE TABLE IF NOT EXISTS inventory_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('IN','OUT','ADJUST')),
    reason TEXT,
    operator_id TEXT,
    cost_at_time REAL,
    created_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id);

-- ==============================================================================
-- MÓDULO: CLIENTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    tax_id TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

-- ==============================================================================
-- MÓDULO: VENDAS (POS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number TEXT,
    doc_type TEXT NOT NULL DEFAULT 'FT' CHECK(doc_type IN ('FT','FR','FS','FP','ND','NC','OC','PF')),
    session_id TEXT,
    customer_id TEXT REFERENCES customers(id),
    customer_name TEXT,
    customer_tax_id TEXT,
    operator_id TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    currency TEXT DEFAULT 'AOA',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','cancelled','void')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(tenant_id, created_at);

-- Itens de fatura
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    discount_pct REAL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_rate REAL DEFAULT 14,
    tax_amount REAL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Sessões de caixa POS
CREATE TABLE IF NOT EXISTS pos_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operator_id TEXT,
    operator_name TEXT,
    opened_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT,
    opening_amount REAL DEFAULT 0,
    closing_amount REAL,
    total_sales REAL DEFAULT 0,
    total_invoices INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','closed')),
    sync_status TEXT DEFAULT 'synced'
);

-- ==============================================================================
-- MÓDULO: FORNECEDORES E COMPRAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    nif TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_no TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','finalized')),
    total_amount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);

CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    cost_price REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0
);

-- ==============================================================================
-- QUEUE DE SINCRONIZAÇÃO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data TEXT,
    timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);

-- ==============================================================================
-- TABELA: leave_requests (FÉRIAS E LICENÇAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK(leave_type IN ('vacation','sick','parental','other')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant ON leave_requests(tenant_id);

-- ==============================================================================
-- CONFIGURAÇÕES DO SISTEMA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Inserir configurações iniciais
INSERT OR IGNORE INTO system_config (key, value) VALUES
    ('schema_version', '2.2.0'),
    ('last_sync', NULL),
    ('server_mode', 'standalone'),
    ('server_port', '3001');
