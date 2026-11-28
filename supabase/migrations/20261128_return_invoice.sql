ALTER TABLE IF EXISTS public.invoices
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'paid';

CREATE OR REPLACE FUNCTION public.return_invoice(invoice_id_param UUID)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  owner_id UUID := auth.uid();
  invoice_row public.invoices;
  item_row RECORD;
  changed INTEGER;
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO invoice_row
  FROM public.invoices
  WHERE id = invoice_id_param AND deleted_at IS NULL AND user_id = owner_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'invoice not found'; END IF;
  IF COALESCE(invoice_row.status, 'paid') = 'returned' THEN RAISE EXCEPTION 'invoice already returned'; END IF;
  IF invoice_row.warehouse_id IS NULL THEN RAISE EXCEPTION 'invoice warehouse is missing'; END IF;

  FOR item_row IN
    SELECT product_id, quantity
    FROM public.invoice_items
    WHERE invoice_id = invoice_row.id
  LOOP
    INSERT INTO public.product_warehouse_stock (product_id, warehouse_id, quantity, user_id)
    VALUES (item_row.product_id, invoice_row.warehouse_id, item_row.quantity, owner_id)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = public.product_warehouse_stock.quantity + EXCLUDED.quantity;

    UPDATE public.products
    SET quantity = COALESCE((
      SELECT SUM(quantity) FROM public.product_warehouse_stock WHERE product_id = item_row.product_id
    ), 0)
    WHERE id = item_row.product_id;
  END LOOP;

  UPDATE public.invoices
  SET status = 'returned', remaining_debt = 0
  WHERE id = invoice_row.id AND status IS DISTINCT FROM 'returned';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'invoice already returned'; END IF;

  IF invoice_row.customer_id IS NOT NULL AND COALESCE(invoice_row.remaining_debt, 0) <> 0 THEN
    UPDATE public.customers
    SET balance = COALESCE(balance, 0) - invoice_row.remaining_debt
    WHERE id = invoice_row.customer_id;
  END IF;

  SELECT * INTO invoice_row FROM public.invoices WHERE id = invoice_id_param;
  RETURN invoice_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.return_invoice(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
