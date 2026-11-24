-- Cashly ERP: objects the app queries but that do not exist in the live DB (found by /qa).
-- Idempotent: safe to run more than once. Run in Supabase Dashboard > SQL Editor.
-- Columns are inferred from lib/*.ts and app/dashboard/** usage; adjust if your design differs.

-- ---------- Roles / users ----------
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier'))
);
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO roles (name) VALUES ('admin'), ('manager'), ('cashier') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  role_id UUID REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Core masters ----------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  balance DECIMAL(19,4) DEFAULT 0,
  last_invoice_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  balance DECIMAL(19,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(10),
  is_default BOOLEAN DEFAULT FALSE
);
INSERT INTO currencies (code, name, symbol, is_default) VALUES ('IQD', 'دينار عراقي', 'د.ع', TRUE) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_id UUID REFERENCES currencies(id) ON DELETE CASCADE,
  rate DECIMAL(19,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- The valuation report joins products(name, code); the older products table only has sku.
ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(50);
CREATE TABLE IF NOT EXISTS product_warehouse_stock (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity DECIMAL(15,2) DEFAULT 0,
  avg_cost DECIMAL(19,4) DEFAULT 0,
  PRIMARY KEY (product_id, warehouse_id)
);

-- ---------- Sales / finance ----------
CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'paid';
CREATE TABLE IF NOT EXISTS treasuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(19,4) DEFAULT 0
);
INSERT INTO treasuries (name) SELECT 'الصندوق الرئيسي' WHERE NOT EXISTS (SELECT 1 FROM treasuries);
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'receipt')),
  amount DECIMAL(19,4) NOT NULL,
  treasury_id UUID REFERENCES treasuries(id),
  account_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Installments ----------
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(19,4) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS installment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID REFERENCES installments(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount DECIMAL(19,4) NOT NULL,
  paid BOOLEAN DEFAULT FALSE
);

-- ---------- Accounting ----------
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50)
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT,
  type VARCHAR(30),
  total_amount DECIMAL(19,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id),
  debit DECIMAL(19,4) DEFAULT 0,
  credit DECIMAL(19,4) DEFAULT 0
);

-- ---------- Profit report RPC ----------
-- One row per invoice (matches reports/accounting/profit page). COGS is not modelled yet, so cost = 0.
DROP FUNCTION IF EXISTS get_profit_report(TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_profit_report(start_date TEXT, end_date TEXT)
RETURNS TABLE (invoice_number VARCHAR, sales NUMERIC, cost NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT s.invoice_number, s.total_amount::NUMERIC, 0::NUMERIC
  FROM sales_invoices s
  WHERE s.created_at >= start_date::timestamptz AND s.created_at <= end_date::timestamptz;
$$;

-- ---------- RLS: authenticated users only ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['roles','user_profiles','customers','suppliers','currencies','exchange_rate_history',
    'warehouses','product_warehouse_stock','sales_invoices','treasuries','vouchers','installments',
    'installment_items','chart_of_accounts','journal_entries','journal_entry_lines']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated all" ON %I', t);
    EXECUTE format('CREATE POLICY "authenticated all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Give every existing auth user a role so the layout query returns one (first user becomes admin).
INSERT INTO user_roles (user_id, role)
SELECT id, CASE WHEN row_number() OVER (ORDER BY created_at) = 1 THEN 'admin' ELSE 'cashier' END
FROM auth.users ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
