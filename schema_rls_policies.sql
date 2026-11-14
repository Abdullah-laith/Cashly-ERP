-- 1. Enable RLS on all main tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- 2. Create helper function for tenant isolation
CREATE OR REPLACE FUNCTION get_org_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'organization_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- 3. Policies for Accounts
CREATE POLICY "Users can view their own accounts" ON accounts
  FOR SELECT USING (organization_id = get_org_id());

CREATE POLICY "Users can insert their own accounts" ON accounts
  FOR INSERT WITH CHECK (organization_id = get_org_id());

-- 4. Policies for Products
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (organization_id = get_org_id());

CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (organization_id = get_org_id());

-- 5. Policies for Invoices
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (organization_id = get_org_id());

CREATE POLICY "Users can insert their own invoices" ON invoices
  FOR INSERT WITH CHECK (organization_id = get_org_id());

-- 6. Policies for Settings
CREATE POLICY "Users can view their own settings" ON organization_settings
  FOR SELECT USING (id = get_org_id());

CREATE POLICY "Users can update their own settings" ON organization_settings
  FOR UPDATE USING (id = get_org_id());
