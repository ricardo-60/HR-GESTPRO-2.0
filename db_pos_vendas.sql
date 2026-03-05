-- ==============================================================================
-- ADDITIONS FOR MODERN POS & SALES MODULE
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. ADD NEW COLUMNS TO EXISTING `products` TABLE
-- ==============================================================================
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='barcode') THEN
        ALTER TABLE products ADD COLUMN barcode VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity NUMERIC(10, 2) DEFAULT 0 NOT NULL;
    END IF;
END $$;


-- 2. CREATE `pos_sessions` TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opening_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_sales NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    invoices_count INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'open' NOT NULL, -- open, closed
    expected_closing_balance NUMERIC(12, 2),
    actual_closing_balance NUMERIC(12, 2),
    difference NUMERIC(12, 2),
    opened_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_tenant ON pos_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_user ON pos_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions(status);


-- 3. CREATE `invoices` TABLE 
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pos_session_id UUID REFERENCES pos_sessions(id) ON DELETE SET NULL,
    invoice_no VARCHAR(100) NOT NULL,
    doc_type VARCHAR(10) DEFAULT 'FT' NOT NULL, -- FT, PF
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_tax_id VARCHAR(50),
    payment_method VARCHAR(50) DEFAULT 'cash' NOT NULL, -- cash, transfer, card, mixed, credit
    payment_status VARCHAR(50) DEFAULT 'paid' NOT NULL, -- paid, pending, cancelled
    due_date DATE,
    subtotal NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(50) DEFAULT 'issued' NOT NULL, -- issued, converted, cancelled
    observations TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(tenant_id, invoice_no)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(pos_session_id);


-- 4. CREATE `invoice_items` TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- optional for custom items
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);


-- 5. STOCK DECREASE TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
DECLARE
    inv_doc_type VARCHAR;
    inv_status VARCHAR;
BEGIN
    -- Only reduce stock if it's connected to a product
    IF NEW.product_id IS NOT NULL THEN
        -- Safely get the invoice details
        SELECT doc_type, status INTO inv_doc_type, inv_status FROM invoices WHERE id = NEW.invoice_id;
        
        -- Don't reduce stock for Proforma Invoices (PF)
        IF inv_doc_type != 'PF' AND inv_status != 'cancelled' THEN
            UPDATE products 
            SET stock_quantity = stock_quantity - NEW.quantity 
            WHERE id = NEW.product_id;
            
            -- Keep stock non-negative check (optional depending on use case)
            -- UPDATE products SET stock_quantity = GREATEST(0, stock_quantity) WHERE id = NEW.product_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_invoice_item_added ON invoice_items;
CREATE TRIGGER on_invoice_item_added
    AFTER INSERT ON invoice_items
    FOR EACH ROW EXECUTE PROCEDURE public.update_product_stock();


-- 6. RPC: INVOICE SEQUENCER
-- ==============================================================================
CREATE OR REPLACE FUNCTION generate_next_invoice_number(p_tenant_id UUID, p_doc_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    current_year VARCHAR;
    next_num INTEGER;
    result VARCHAR;
BEGIN
    current_year := to_char(now(), 'YYYY');
    
    SELECT COUNT(*) + 1 INTO next_num
    FROM invoices
    WHERE tenant_id = p_tenant_id 
      AND doc_type = p_doc_type
      AND to_char(created_at, 'YYYY') = current_year;
      
    -- Result Format: "FT 2024/1"
    result := p_doc_type || ' ' || current_year || '/' || next_num;
    RETURN result;
END;
$$ LANGUAGE plpgsql;


-- 7. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ==============================================================================
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Note: We assume "user_profiles" maps auth.uid() to tenant_id

DROP POLICY IF EXISTS "Tenant Isolation - POS Sessions" ON pos_sessions;
CREATE POLICY "Tenant Isolation - POS Sessions" ON pos_sessions
    FOR ALL TO authenticated
    USING ( tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()) );

DROP POLICY IF EXISTS "Tenant Isolation - Invoices" ON invoices;
CREATE POLICY "Tenant Isolation - Invoices" ON invoices
    FOR ALL TO authenticated
    USING ( tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()) );

DROP POLICY IF EXISTS "Tenant Isolation - Invoice Items" ON invoice_items;
CREATE POLICY "Tenant Isolation - Invoice Items" ON invoice_items
    FOR ALL TO authenticated
    USING ( 
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
              AND invoices.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
        )
    );

-- END OF SCRIPT
