ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS governorate TEXT,
  ADD COLUMN IF NOT EXISTS customer_channel TEXT;

UPDATE public.customers
SET customer_channel = 'store'
WHERE customer_channel IS NULL;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_customer_channel_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_customer_channel_check
  CHECK (customer_channel IS NULL OR customer_channel IN ('online', 'store'));
