-- Atomic warehouse-aware inventory operations.
ALTER TABLE IF EXISTS public.purchases
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

ALTER TABLE IF EXISTS public.invoices
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

CREATE OR REPLACE FUNCTION public.sync_product_total(product_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET quantity = COALESCE((
    SELECT SUM(quantity) FROM public.product_warehouse_stock
    WHERE product_id = product_id_param
  ), 0)
  WHERE id = product_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_stock(
  product_id_param UUID,
  from_warehouse_id_param UUID,
  to_warehouse_id_param UUID,
  quantity_param NUMERIC,
  notes_param TEXT DEFAULT NULL
)
RETURNS public.stock_transfers
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  transfer_row public.stock_transfers;
  changed INTEGER;
  owner_id UUID := auth.uid();
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF quantity_param IS NULL OR quantity_param <= 0 THEN RAISE EXCEPTION 'quantity must be greater than zero'; END IF;
  IF from_warehouse_id_param = to_warehouse_id_param THEN RAISE EXCEPTION 'warehouses must be different'; END IF;

  UPDATE public.product_warehouse_stock
  SET quantity = quantity - quantity_param
  WHERE product_id = product_id_param
    AND warehouse_id = from_warehouse_id_param
    AND quantity >= quantity_param
    AND user_id = owner_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'insufficient stock in source warehouse'; END IF;

  INSERT INTO public.product_warehouse_stock (product_id, warehouse_id, quantity, avg_cost, user_id)
  SELECT product_id_param, to_warehouse_id_param, quantity_param, COALESCE(source.avg_cost, 0), owner_id
  FROM public.product_warehouse_stock AS source
  WHERE source.product_id = product_id_param AND source.warehouse_id = from_warehouse_id_param
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET quantity = public.product_warehouse_stock.quantity + EXCLUDED.quantity;

  PERFORM public.sync_product_total(product_id_param);
  INSERT INTO public.stock_transfers (user_id, product_id, from_warehouse_id, to_warehouse_id, quantity, notes)
  VALUES (owner_id, product_id_param, from_warehouse_id_param, to_warehouse_id_param, quantity_param, notes_param)
  RETURNING * INTO transfer_row;
  RETURN transfer_row;
END;
$$;

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
    PERFORM public.sync_product_total(product);
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

CREATE OR REPLACE FUNCTION public.create_purchase_with_stock(
  supplier_name_param TEXT,
  product_id_param UUID,
  product_name_param TEXT,
  warehouse_id_param UUID,
  quantity_param NUMERIC,
  unit_cost_param NUMERIC,
  total_cost_param NUMERIC
)
RETURNS public.purchases
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  purchase_row public.purchases;
  owner_id UUID := auth.uid();
  current_cost NUMERIC;
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF warehouse_id_param IS NULL THEN RAISE EXCEPTION 'warehouse is required'; END IF;
  IF quantity_param IS NULL OR quantity_param <= 0 OR unit_cost_param IS NULL OR unit_cost_param < 0 THEN
    RAISE EXCEPTION 'invalid purchase quantity or cost';
  END IF;
  IF product_id_param IS NOT NULL THEN
    SELECT COALESCE(avg_cost, 0) INTO current_cost
    FROM public.product_warehouse_stock
    WHERE product_id = product_id_param AND warehouse_id = warehouse_id_param AND user_id = owner_id
    FOR UPDATE;
    INSERT INTO public.product_warehouse_stock (product_id, warehouse_id, quantity, avg_cost, user_id)
    VALUES (product_id_param, warehouse_id_param, quantity_param, unit_cost_param, owner_id)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity = public.product_warehouse_stock.quantity + EXCLUDED.quantity,
      avg_cost = CASE WHEN public.product_warehouse_stock.quantity + EXCLUDED.quantity = 0 THEN EXCLUDED.avg_cost
        ELSE ((public.product_warehouse_stock.quantity * public.product_warehouse_stock.avg_cost) + (EXCLUDED.quantity * EXCLUDED.avg_cost)) /
          (public.product_warehouse_stock.quantity + EXCLUDED.quantity) END;
    PERFORM public.sync_product_total(product_id_param);
    UPDATE public.products SET cost_price = unit_cost_param WHERE id = product_id_param AND user_id = owner_id;
  END IF;
  INSERT INTO public.purchases (supplier_name, product_id, product_name, warehouse_id, quantity, unit_cost, total_cost, user_id)
  VALUES (supplier_name_param, product_id_param, product_name_param, warehouse_id_param, quantity_param, unit_cost_param, total_cost_param, owner_id)
  RETURNING * INTO purchase_row;
  RETURN purchase_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_stock(JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase_with_stock(TEXT, UUID, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
NOTIFY pgrst, 'reload schema';
