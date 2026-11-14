-- إضافة عمود رقم هاتف الزبون لجدول الفواتير
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
