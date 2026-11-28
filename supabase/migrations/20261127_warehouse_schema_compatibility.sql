-- Bring legacy warehouses tables up to the multi-warehouse inventory schema.
-- Safe to run when warehouses was created by the original schema.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.get_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'organization_id', '')::UUID;
$$;

ALTER TABLE IF EXISTS public.warehouses
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.warehouses
  ALTER COLUMN organization_id SET DEFAULT public.get_org_id(),
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE UNIQUE INDEX IF NOT EXISTS warehouses_one_default_per_user
  ON public.warehouses (user_id)
  WHERE is_default AND user_id IS NOT NULL;

ALTER TABLE IF EXISTS public.product_warehouse_stock
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.product_warehouse_stock
  ALTER COLUMN organization_id SET DEFAULT public.get_org_id(),
  ALTER COLUMN user_id SET DEFAULT auth.uid();

NOTIFY pgrst, 'reload schema';
