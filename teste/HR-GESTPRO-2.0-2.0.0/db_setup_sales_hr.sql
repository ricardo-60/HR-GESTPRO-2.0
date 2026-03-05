-- ==============================================================================
-- LIMPEZA E RENOVAÇÃO DO SCHEMA (DROP ANTIGO -> CREATE NOVO)
-- ==============================================================================

-- 0. LIMPEZA DAS TABELAS ANTIGAS PARA EVITAR CONFLITOS (Atenção: Apaga os dados antigos!)
DROP TABLE IF EXISTS "order_items" CASCADE;
DROP TABLE IF EXISTS "sales_orders" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "customers" CASCADE;
DROP TABLE IF EXISTS "payroll_records" CASCADE;
DROP TABLE IF EXISTS "time_off_requests" CASCADE;
DROP TABLE IF EXISTS "employees" CASCADE;
DROP TABLE IF EXISTS "departments" CASCADE;

-- (Aviso: Não estamos a apagar tenants ou user_profiles pois a app principal depende delas)

-- ==============================================================================
-- SUPABASE SAAS SCHEMA: SALES & HUMAN RESOURCES MULTI-TENANT ARCHITECTURE
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
-- Sales Enums (Evitar erro duplicate_object)
DO $$ BEGIN
    CREATE TYPE customer_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- HR Enums
DO $$ BEGIN
    CREATE TYPE employee_status AS ENUM ('active', 'on_leave', 'terminated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_type AS ENUM ('vacation', 'sick_leave', 'unpaid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payroll_status AS ENUM ('draft', 'processed', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. UTILITY FUNCTIONS
-- Automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================================================
-- MODULE: SALES MANAGEMENT
-- ==============================================================================

-- CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_id VARCHAR(50),
    status customer_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- SALES ORDERS
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_number VARCHAR(100) NOT NULL,
    order_date DATE NOT NULL,
    status order_status DEFAULT 'draft' NOT NULL,
    total_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, order_number)
);

CREATE INDEX idx_sales_orders_tenant ON sales_orders(tenant_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE TRIGGER update_sales_orders_modtime BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ORDER ITEMS
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_at_sale NUMERIC(12, 2) NOT NULL CHECK (unit_price_at_sale >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE TRIGGER update_order_items_modtime BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- ==============================================================================
-- MODULE: HUMAN RESOURCES (HR)
-- ==============================================================================

-- DEPARTMENTS
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id);
CREATE TRIGGER update_departments_modtime BEFORE UPDATE ON departments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- EMPLOYEES
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    job_title VARCHAR(150) NOT NULL,
    hire_date DATE NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL CHECK (base_salary >= 0),
    status employee_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_dept ON employees(department_id);
CREATE TRIGGER update_employees_modtime BEFORE UPDATE ON employees FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- TIME OFF REQUESTS
CREATE TABLE time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    status leave_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_time_off_employee ON time_off_requests(employee_id);
CREATE TRIGGER update_time_off_modtime BEFORE UPDATE ON time_off_requests FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- PAYROLL RECORDS
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK (period_year > 2000),
    gross_pay NUMERIC(12, 2) NOT NULL CHECK (gross_pay >= 0),
    net_pay NUMERIC(12, 2) NOT NULL CHECK (net_pay >= 0),
    status payroll_status DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(employee_id, period_month, period_year)
);

CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);
CREATE TRIGGER update_payroll_modtime BEFORE UPDATE ON payroll_records FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- Note: This assumes existence of a view/function or table "user_profiles" 
-- that maps auth.uid() to a tenant_id. 
-- Example standard isolated multi-tenant policy format:

-- Customers Policy
CREATE POLICY "Tenant Isolation - Customers" ON customers
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Products Policy
CREATE POLICY "Tenant Isolation - Products" ON products
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Sales Orders Policy
CREATE POLICY "Tenant Isolation - Sales Orders" ON sales_orders
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Order Items Policy
CREATE POLICY "Tenant Isolation - Order Items" ON order_items
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Departments Policy
CREATE POLICY "Tenant Isolation - Departments" ON departments
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Employees Policy
CREATE POLICY "Tenant Isolation - Employees" ON employees
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Time Off Requests Policy
CREATE POLICY "Tenant Isolation - Time Off" ON time_off_requests
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- Payroll Records Policy
CREATE POLICY "Tenant Isolation - Payroll" ON payroll_records
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- End of Script
