-- جدول المنتجات والمخزون
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE, -- باركود أو كود المنتج
  category VARCHAR(100),
  buy_price DECIMAL(15, 2) DEFAULT 0.00, -- سعر الشراء
  sell_price DECIMAL(15, 2) DEFAULT 0.00, -- سعر البيع
  quantity INT DEFAULT 0, -- الكمية المتوفرة
  min_quantity INT DEFAULT 5, -- حد الإنذار لنقص المخزون
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- سياسة الوصول
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "توفير الوصول للجميع للتطوير"
ON products FOR ALL
USING (true)
WITH CHECK (true);
