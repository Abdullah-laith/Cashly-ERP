-- إضافة عمود التكلفة لجدول المنتجات
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15, 2);

-- تحديث البيانات بمنتجات حقيقية
DELETE FROM products; -- تنظيف القديم

INSERT INTO products (name, sell_price, cost_price, quantity) VALUES
('آيفون 16 برو', 1450000, 1300000, 15),
('سامسونج S25 ألترا', 1300000, 1150000, 10),
('سماعات سوني WH-1000XM5', 450000, 380000, 8),
('شاحن سريع 65 واط', 45000, 25000, 50),
('لابتوب ماك بوك أير M3', 1850000, 1600000, 5);

-- إضافة فواتير تجريبية (لمبيعات سابقة)
INSERT INTO invoices (customer_name, total_amount, created_at) VALUES
('أحمد محمد', 1450000, NOW() - INTERVAL '3 days'),
('سارة علي', 450000, NOW() - INTERVAL '2 days'),
('شركة المستقبل', 1300000, NOW() - INTERVAL '1 day');
