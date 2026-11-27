ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_type TEXT;

UPDATE public.customers
SET customer_type = CASE WHEN customer_channel = 'online' THEN 'online' ELSE 'in_store' END
WHERE customer_type IS NULL;

ALTER TABLE public.customers
  ALTER COLUMN customer_type SET DEFAULT 'in_store';

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_customer_type_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_customer_type_check
  CHECK (customer_type IS NULL OR customer_type IN ('online', 'in_store'));

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_type TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_mode TEXT NOT NULL DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(19,4) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.create_invoice_with_stock(invoice_payload JSONB, invoice_items_payload JSONB)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  created_invoice public.invoices;
  line_item JSONB;
  requested NUMERIC;
  product UUID;
  changed INTEGER;
BEGIN
  IF jsonb_array_length(invoice_items_payload) = 0 THEN RAISE EXCEPTION 'invoice must contain at least one item'; END IF;
  FOR line_item IN SELECT value FROM jsonb_array_elements(invoice_items_payload) LOOP
    product := (line_item ->> 'product_id')::UUID;
    requested := (line_item ->> 'quantity')::NUMERIC;
    IF requested IS NULL OR requested <= 0 THEN RAISE EXCEPTION 'quantity must be greater than zero'; END IF;
    UPDATE public.products SET quantity = quantity - requested WHERE id = product AND quantity >= requested;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> 1 THEN RAISE EXCEPTION 'insufficient stock for product %', product; END IF;
  END LOOP;
  INSERT INTO public.invoices (invoice_number, customer_id, customer_name, customer_phone, customer_type, subtotal_amount, discount_amount, discount_mode, shipping_amount, total_amount, payment_type, remaining_debt, created_at, notes)
  VALUES (invoice_payload ->> 'invoice_number', NULLIF(invoice_payload ->> 'customer_id', '')::UUID, invoice_payload ->> 'customer_name', invoice_payload ->> 'customer_phone', invoice_payload ->> 'customer_type', COALESCE((invoice_payload ->> 'subtotal_amount')::NUMERIC, 0), COALESCE((invoice_payload ->> 'discount_amount')::NUMERIC, 0), COALESCE(invoice_payload ->> 'discount_mode', 'amount'), COALESCE((invoice_payload ->> 'shipping_amount')::NUMERIC, 0), (invoice_payload ->> 'total_amount')::NUMERIC, invoice_payload ->> 'payment_type', COALESCE((invoice_payload ->> 'remaining_debt')::NUMERIC, 0), COALESCE((invoice_payload ->> 'created_at')::TIMESTAMPTZ, NOW()), invoice_payload ->> 'notes')
  RETURNING * INTO created_invoice;
  INSERT INTO public.invoice_items (invoice_id, product_id, quantity, price)
  SELECT created_invoice.id, (payload_item ->> 'product_id')::UUID, (payload_item ->> 'quantity')::NUMERIC, (payload_item ->> 'price')::NUMERIC
  FROM jsonb_array_elements(invoice_items_payload) AS elements(payload_item);
  RETURN created_invoice;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice_with_stock(JSONB, JSONB) TO authenticated;
NOTIFY pgrst, 'reload schema';
