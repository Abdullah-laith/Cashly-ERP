-- 1. Currencies & Exchange Rates
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(3) UNIQUE NOT NULL, -- IQD, USD, EUR, etc.
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(10),
  is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE exchange_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_id UUID REFERENCES currencies(id) ON DELETE CASCADE,
  rate DECIMAL(19, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Warehouses
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Products Management
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id)
);

CREATE TABLE unit_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL, -- e.g., "Box", "Ton"
  conversion_factor DECIMAL(10, 4) DEFAULT 1.0
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand_id UUID REFERENCES brands(id),
  category_id UUID REFERENCES categories(id),
  unit_template_id UUID REFERENCES unit_templates(id),
  min_stock_level DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE product_warehouse_stock (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity DECIMAL(15, 2) DEFAULT 0,
  avg_cost DECIMAL(19, 4) DEFAULT 0,
  PRIMARY KEY (product_id, warehouse_id)
);

-- 4. Invoices (Simplified Example)
CREATE TABLE sales_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID, -- Reference to customers table
  total_amount DECIMAL(19, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Note: RLS policies should be added here for each table
-- Example:
-- ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow authenticated users" ON currencies FOR ALL TO authenticated USING (true);
