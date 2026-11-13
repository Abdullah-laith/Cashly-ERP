-- جدول إعدادات المؤسسة (لجعل النظام ذكياً ومرناً)
CREATE TABLE organization_settings (
  organization_id UUID REFERENCES organizations(id) PRIMARY KEY,
  use_inventory BOOLEAN DEFAULT true,
  use_invoicing BOOLEAN DEFAULT true,
  tax_rate DECIMAL(5, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل الأمان
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "السماح بالوصول للمؤسسة الخاصة" ON organization_settings
FOR ALL USING (auth.role() = 'authenticated');
