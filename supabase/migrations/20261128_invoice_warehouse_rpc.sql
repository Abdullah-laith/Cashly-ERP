-- Restore the warehouse-aware invoice RPC expected by the POS.
ALTER TABLE IF EXISTS public.warehouses
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.product_warehouse_stock
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.warehouses
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE IF EXISTS public.product_warehouse_stock
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE IF EXISTS public.invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_type TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_mode TEXT NOT NULL DEFAULT 'amount',
  ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS remaining_debt NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.create_invoice_with_stock(
  invoice_payload JSONB,
  invoice_items_payload JSONB,
  warehouse_id_param UUID
)
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
  owner_id UUID := auth.uid();
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF warehouse_id_param IS NULL THEN RAISE EXCEPTION 'warehouse is required'; END IF;
  IF jsonb_array_length(invoice_items_payload) = 0 THEN RAISE EXCEPTION 'invoice must contain at least one item'; END IF;

  FOR line_item IN SELECT value FROM jsonb_array_elements(invoice_items_payload) LOOP
    product := (line_item ->> 'product_id')::UUID;
    requested := (line_item ->> 'quantity')::NUMERIC;
    IF requested IS NULL OR requested <= 0 THEN RAISE EXCEPTION 'quantity must be greater than zero'; END IF;
    UPDATE public.product_warehouse_stock
    SET quantity = quantity - requested
    WHERE product_id = product AND warehouse_id = warehouse_id_param
      AND quantity >= requested AND user_id = owner_id;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> 1 THEN RAISE EXCEPTION 'insufficient stock for product % in selected warehouse', product; END IF;
    UPDATE public.products
    SET quantity = COALESCE((SELECT SUM(quantity) FROM public.product_warehouse_stock WHERE product_id = product), 0)
    WHERE id = product;
  END LOOP;

  INSERT INTO public.invoices (
    invoice_number, customer_id, customer_name, customer_phone, customer_type,
    subtotal_amount, discount_amount, discount_mode, shipping_amount, total_amount,
    payment_type, remaining_debt, created_at, notes, warehouse_id, user_id
  )
  VALUES (
    invoice_payload ->> 'invoice_number', NULLIF(invoice_payload ->> 'customer_id', '')::UUID,
    invoice_payload ->> 'customer_name', invoice_payload ->> 'customer_phone', invoice_payload ->> 'customer_type',
    COALESCE((invoice_payload ->> 'subtotal_amount')::NUMERIC, 0),
    COALESCE((invoice_payload ->> 'discount_amount')::NUMERIC, 0),
    COALESCE(invoice_payload ->> 'discount_mode', 'amount'),
    COALESCE((invoice_payload ->> 'shipping_amount')::NUMERIC, 0),
    (invoice_payload ->> 'total_amount')::NUMERIC, invoice_payload ->> 'payment_type',
    COALESCE((invoice_payload ->> 'remaining_debt')::NUMERIC, 0),
    COALESCE((invoice_payload ->> 'created_at')::TIMESTAMPTZ, NOW()), invoice_payload ->> 'notes',
    warehouse_id_param, owner_id
  ) RETURNING * INTO created_invoice;

  INSERT INTO public.invoice_items (invoice_id, product_id, quantity, price)
  SELECT created_invoice.id, (payload_item ->> 'product_id')::UUID,
    (payload_item ->> 'quantity')::NUMERIC, (payload_item ->> 'price')::NUMERIC
  FROM jsonb_array_elements(invoice_items_payload) AS elements(payload_item);

  RETURN created_invoice;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice_with_stock(JSONB, JSONB, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
