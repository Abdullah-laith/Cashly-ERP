-- Cashly ERP safe schema synchronisation.
-- Run in Supabase SQL Editor. This script is intentionally idempotent.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier'))
);
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255), email VARCHAR(255), role_id UUID REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL,
  phone VARCHAR(50), address TEXT, balance NUMERIC(19,4) DEFAULT 0,
  last_invoice_date TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL,
  phone VARCHAR(50), address TEXT, balance NUMERIC(19,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL, symbol VARCHAR(10), is_default BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), currency_id UUID REFERENCES currencies(id) ON DELETE CASCADE,
  rate NUMERIC(19,4) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(100) NOT NULL,
  location TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS unit_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(50) NOT NULL,
  conversion_factor NUMERIC(10,4) DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code VARCHAR(50) UNIQUE,
  sku VARCHAR(50), name VARCHAR(255) NOT NULL, brand_id UUID REFERENCES brands(id),
  category_id UUID REFERENCES categories(id), category VARCHAR(100), unit_template_id UUID REFERENCES unit_templates(id),
  min_stock_level NUMERIC(12,2) DEFAULT 0, min_quantity NUMERIC(12,2) DEFAULT 0,
  buy_price NUMERIC(19,4) DEFAULT 0, cost_price NUMERIC(19,4) DEFAULT 0,
  sell_price NUMERIC(19,4) DEFAULT 0, wholesale_price NUMERIC(19,4) DEFAULT 0,
  quantity NUMERIC(15,2) DEFAULT 0, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_warehouse_stock (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC(15,2) DEFAULT 0, avg_cost NUMERIC(19,4) DEFAULT 0,
  PRIMARY KEY (product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), invoice_number VARCHAR(50) UNIQUE,
  customer_id UUID REFERENCES customers(id), customer_name VARCHAR(255), customer_phone VARCHAR(50),
  total_amount NUMERIC(19,4) NOT NULL DEFAULT 0, payment_type VARCHAR(20) DEFAULT 'cash',
  remaining_debt NUMERIC(19,4) DEFAULT 0, notes TEXT, deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id), quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  price NUMERIC(19,4) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), invoice_number VARCHAR(50) UNIQUE,
  customer_id UUID REFERENCES customers(id), total_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'paid', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), supplier_name VARCHAR(255),
  product_id UUID REFERENCES products(id), total_cost NUMERIC(19,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), title VARCHAR(255) NOT NULL,
  amount NUMERIC(19,4) NOT NULL DEFAULT 0, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS treasuries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) DEFAULT 'IQD', balance NUMERIC(19,4) DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), type VARCHAR(20) NOT NULL,
  amount NUMERIC(19,4) NOT NULL, treasury_id UUID REFERENCES treasuries(id), account_id UUID,
  description TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id UUID REFERENCES customers(id),
  total_amount NUMERIC(19,4) NOT NULL DEFAULT 0, installments_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS installment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), installment_id UUID REFERENCES installments(id) ON DELETE CASCADE,
  due_date DATE NOT NULL, amount NUMERIC(19,4) NOT NULL DEFAULT 0, paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code VARCHAR(20) UNIQUE,
  name VARCHAR(100) NOT NULL, type VARCHAR(50)
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), description TEXT, type VARCHAR(30),
  total_amount NUMERIC(19,4) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id), debit NUMERIC(19,4) DEFAULT 0, credit NUMERIC(19,4) DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), transaction_type VARCHAR(50),
  reference_id UUID, amount NUMERIC(19,4) DEFAULT 0, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), org_name VARCHAR(255) DEFAULT '',
  currency VARCHAR(20) DEFAULT 'د.ع', address TEXT, logo_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bring older installations up to the columns used by the current app and seed script.
ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_quantity NUMERIC(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS buy_price NUMERIC(19,4) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(19,4) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_price NUMERIC(19,4) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(19,4) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 0;
ALTER TABLE treasuries ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IQD';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'paid';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(19,4) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS price NUMERIC(19,4) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS total_cost NUMERIC(19,4) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount NUMERIC(19,4) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS treasury_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'cash';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS remaining_debt NUMERIC(19,4) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installments_count INTEGER DEFAULT 0;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS org_name VARCHAR(255) DEFAULT '';
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'د.ع';
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO roles (name) VALUES ('admin'), ('manager'), ('cashier') ON CONFLICT DO NOTHING;
INSERT INTO currencies (code, name, symbol, is_default)
VALUES ('IQD', 'دينار عراقي', 'د.ع', TRUE) ON CONFLICT DO NOTHING;
INSERT INTO treasuries (name, currency)
SELECT 'الصندوق الرئيسي', 'IQD'
WHERE NOT EXISTS (SELECT 1 FROM treasuries);

CREATE OR REPLACE FUNCTION get_profit_report(start_date TEXT, end_date TEXT)
RETURNS TABLE (invoice_number VARCHAR, sales NUMERIC, cost NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT s.invoice_number, s.total_amount::NUMERIC, 0::NUMERIC
  FROM sales_invoices s
  WHERE s.created_at >= start_date::timestamptz AND s.created_at <= end_date::timestamptz;
$$;

CREATE OR REPLACE FUNCTION delete_invoice_with_items(invoice_id_param UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE invoices SET deleted_at = NOW()
  WHERE id = invoice_id_param AND deleted_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_invoice_with_items(UUID) TO authenticated;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'roles','user_profiles','user_roles','customers','suppliers','currencies','exchange_rate_history',
    'warehouses','brands','categories','unit_templates','products','product_warehouse_stock','invoices',
    'invoice_items','sales_invoices','purchases','expenses','treasuries','vouchers','installments',
    'installment_items','chart_of_accounts','journal_entries','journal_entry_lines','ledger','organization_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated all" ON %I', table_name);
    EXECUTE format('CREATE POLICY "authenticated all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
