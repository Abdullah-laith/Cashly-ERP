-- Fix: invoice delete silently did nothing (RLS has no UPDATE/DELETE policy on invoices).
-- Soft-deletes the invoice (the sales page filters on deleted_at IS NULL) and returns rows affected.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS delete_invoice_with_items(UUID);
CREATE OR REPLACE FUNCTION delete_invoice_with_items(invoice_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE invoices SET deleted_at = NOW() WHERE id = invoice_id_param AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION delete_invoice_with_items(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
