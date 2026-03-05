-- ==============================================================================
-- MÓDULO DE COMPRAS, FORNECEDORES E PMP (ANGOLA)
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE purchase_status AS ENUM ('draft', 'finalized');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELAS

-- FORNECEDORES
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nif VARCHAR(20), -- Validação de NIF Angolano (9 dígitos geralmente)
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE TRIGGER update_suppliers_modtime BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- NOTAS DE ENTRADA (COMPRAS)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_no VARCHAR(100) NOT NULL, -- Nº da fatura do fornecedor
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status purchase_status DEFAULT 'draft' NOT NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE TRIGGER update_purchase_orders_modtime BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ITENS DA COMPRA
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    cost_price NUMERIC(15, 2) NOT NULL CHECK (cost_price >= 0),
    total NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_order ON purchase_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- CONTAS A PAGAR
CREATE TABLE IF NOT EXISTS accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_tenant ON accounts_payable(tenant_id);
CREATE TRIGGER update_accounts_payable_modtime BEFORE UPDATE ON accounts_payable FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 3. LÓGICA DE TRIGGER: STOCK E PMP

CREATE OR REPLACE FUNCTION process_finalized_purchase()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_stock_val NUMERIC;
    current_avg_cost NUMERIC;
    new_stock NUMERIC;
    new_avg_cost NUMERIC;
BEGIN
    -- Só processa se o status mudar de 'draft' para 'finalized'
    IF (OLD.status = 'draft' AND NEW.status = 'finalized') THEN
        
        -- Loop pelos itens da compra
        FOR item IN SELECT * FROM purchase_items WHERE purchase_order_id = NEW.id LOOP
            
            -- Obter valores atuais do produto
            SELECT COALESCE(stock_current, 0), COALESCE(average_cost, cost_price, 0)
            INTO current_stock_val, current_avg_cost
            FROM products
            WHERE id = item.product_id;

            -- Cálculo de PMP: ((QtdAnterior * CustoAnterior) + (QtdNova * PrecoNovo)) / (QtdAnterior + QtdNova)
            IF (current_stock_val + item.quantity) > 0 THEN
                new_avg_cost := ((current_stock_val * current_avg_cost) + (item.quantity * item.cost_price)) / (current_stock_val + item.quantity);
            ELSE
                new_avg_cost := item.cost_price;
            END IF;

            new_stock := current_stock_val + item.quantity;

            -- Atualizar produto
            UPDATE products
            SET 
                stock_current = new_stock,
                average_cost = new_avg_cost,
                cost_price = item.cost_price -- O cost_price passa a ser o último preço de compra para referência rápida
            WHERE id = item.product_id;

        END LOOP;

        -- Gerar registo em Contas a Pagar (vencimento em 30 dias por padrão ou data da compra)
        INSERT INTO accounts_payable (tenant_id, purchase_order_id, supplier_id, description, amount, due_date)
        VALUES (NEW.tenant_id, NEW.id, NEW.supplier_id, 'Compra: ' || NEW.order_no, NEW.total_amount, NEW.purchase_date + INTERVAL '30 days');

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finalize_purchase
AFTER UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION process_finalized_purchase();

-- 4. RLS POLICIES

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation - Suppliers" ON suppliers FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant Isolation - Purchase Orders" ON purchase_orders FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant Isolation - Purchase Items" ON purchase_items FOR ALL TO authenticated
USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())));

CREATE POLICY "Tenant Isolation - Accounts Payable" ON accounts_payable FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
