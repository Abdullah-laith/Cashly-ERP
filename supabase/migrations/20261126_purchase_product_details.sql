-- Add the fields used by the single-page purchase register and product serial numbers.
ALTER TABLE products ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(19,4) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
