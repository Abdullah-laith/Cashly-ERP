-- 1. جدول المؤسسات (الشركات المشتركة في النظام)
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(10) DEFAULT 'IQD', -- الدينار العراقي كعملة افتراضية
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. تعديل جدول الحسابات ليدعم الـ Multi-tenancy
ALTER TABLE accounts ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 3. تعديل جدول المنتجات ليدعم الـ Multi-tenancy
ALTER TABLE products ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. تحديث السياسات الأمنية (RLS) لتضمن عزل البيانات
-- يجب أن يكون لكل جدول سياسة تمنع الوصول إلا لبيانات الـ organization_id الخاص بالمستخدم
-- ملاحظة: في النسخة النهائية سنحتاج لجدول profiles يربط المستخدم بالـ organization
