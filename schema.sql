-- جدول شجرة الحسابات (Chart of Accounts)
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- أصول، التزامات، حقوق ملكية، إيرادات، مصروفات
  parent_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- سياسات الأمان (Row Level Security)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "السماح بالوصول للمستخدمين المسجلين فقط"
ON accounts FOR ALL
USING (auth.role() = 'authenticated');
