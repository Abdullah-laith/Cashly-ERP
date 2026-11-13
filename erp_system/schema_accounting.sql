-- شجرة الحسابات الاحترافية (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- مثلاً 1000، 1100
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- (Asset, Liability, Equity, Revenue, Expense)
  parent_id UUID REFERENCES accounts(id),
  balance DECIMAL(15, 2) DEFAULT 0,
  is_leaf BOOLEAN DEFAULT true -- هل الحساب فرعي (يمكن التسجيل فيه) أم رئيسي
);

-- البيانات الافتراضية لشركة تعمل منذ 4 أشهر
INSERT INTO accounts (code, name, type, is_leaf) VALUES
('1000', 'الأصول', 'Asset', false),
('1100', 'الأصول المتداولة', 'Asset', false),
('1101', 'النقدية في الصندوق', 'Asset', true),
('1102', 'البنك', 'Asset', true),
('1103', 'المخزون', 'Asset', true),
('1200', 'الأصول الثابتة', 'Asset', false),
('1201', 'أثاث وتجهيزات', 'Asset', true),
('2000', 'الخصوم', 'Liability', false),
('2100', 'دائنون', 'Liability', true),
('3000', 'حقوق الملكية', 'Equity', false),
('3100', 'رأس المال', 'Equity', true),
('4000', 'الإيرادات', 'Revenue', false),
('4100', 'مبيعات', 'Revenue', true),
('5000', 'المصاريف', 'Expense', false),
('5100', 'مصاريف التشغيل', 'Expense', true),
('5200', 'إيجار', 'Expense', true);
