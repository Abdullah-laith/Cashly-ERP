-- Cashly ERP: multi-warehouse inventory setup.
-- Safe to run repeatedly in Supabase SQL Editor.
-- Existing POS queries continue to use products.quantity; per-warehouse quantities
-- are stored in product_warehouse_stock.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.get_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'organization_id', '')::UUID;
$$;

-- Make tenant columns available on legacy products before they are referenced
-- by the migration below.
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT public.get_org_id(),
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- Keep the tenant columns compatible with both the current user-based isolation
-- and installations that already expose organization_id in JWT claims.
ALTER TABLE IF EXISTS public.warehouses
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.warehouses
  ALTER COLUMN organization_id SET DEFAULT public.get_org_id(),
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location TEXT,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.warehouses
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.warehouses
  ALTER COLUMN organization_id SET DEFAULT public.get_org_id(),
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Existing rows created before tenant isolation are assigned to the first user,
-- matching the existing multi_tenant_isolation.sql backfill convention.
UPDATE public.products
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL
  AND organization_id IS NULL;

UPDATE public.warehouses
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL
  AND organization_id IS NULL;

-- A default warehouse is created for every existing authenticated owner. The
-- unique partial index makes this block idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_one_default_per_user
  ON public.warehouses (user_id)
  WHERE is_default AND user_id IS NOT NULL;

INSERT INTO public.warehouses (user_id, name, is_default)
SELECT u.id, 'المخزن الافتراضي', TRUE
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.warehouses AS w
  WHERE w.user_id = u.id AND w.is_default
);

-- The existing relation is retained so reports and future warehouse-aware
-- queries keep working without changing products.quantity.
CREATE TABLE IF NOT EXISTS public.product_warehouse_stock (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(19,4) NOT NULL DEFAULT 0,
  organization_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, warehouse_id)
);

ALTER TABLE IF EXISTS public.product_warehouse_stock
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.product_warehouse_stock
  ALTER COLUMN organization_id SET DEFAULT public.get_org_id(),
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Associate existing stock rows with the same owner as their product or warehouse.
UPDATE public.product_warehouse_stock AS pws
SET user_id = COALESCE(pws.user_id, p.user_id, w.user_id),
    organization_id = COALESCE(pws.organization_id, w.organization_id, p.organization_id)
FROM public.products AS p
JOIN public.warehouses AS w ON w.id = pws.warehouse_id
WHERE p.id = pws.product_id
  AND (pws.user_id IS NULL OR pws.organization_id IS NULL);

-- Migrate each product's legacy total quantity once into its owner's default
-- warehouse. Existing per-warehouse rows are preserved and never duplicated.
INSERT INTO public.product_warehouse_stock
  (product_id, warehouse_id, quantity, avg_cost, organization_id, user_id)
SELECT
  p.id,
  w.id,
  COALESCE(p.quantity, 0),
  COALESCE(p.cost_price, p.buy_price, 0),
  COALESCE(p.organization_id, w.organization_id),
  COALESCE(p.user_id, w.user_id)
FROM public.products AS p
JOIN public.warehouses AS w
  ON w.is_default
 AND (
   (p.user_id IS NOT NULL AND w.user_id = p.user_id)
   OR (p.organization_id IS NOT NULL AND w.organization_id = p.organization_id)
 )
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_warehouse_stock AS existing
  WHERE existing.product_id = p.id
);

CREATE INDEX IF NOT EXISTS product_warehouse_stock_warehouse_idx
  ON public.product_warehouse_stock (warehouse_id);
CREATE INDEX IF NOT EXISTS product_warehouse_stock_product_idx
  ON public.product_warehouse_stock (product_id);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_transfers_different_warehouses CHECK (from_warehouse_id <> to_warehouse_id)
);

ALTER TABLE IF EXISTS public.stock_transfers
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.stock_transfers
  ALTER COLUMN organization_id SET DEFAULT public.get_org_id(),
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS stock_transfers_product_idx
  ON public.stock_transfers (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_transfers_from_warehouse_idx
  ON public.stock_transfers (from_warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_transfers_to_warehouse_idx
  ON public.stock_transfers (to_warehouse_id, created_at DESC);

-- Use organization_id when the session supplies it, otherwise use the existing
-- user_id tenant model. The function returns NULL for tokens without a claim.
DO $$
DECLARE
  table_name TEXT;
  policy_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['warehouses', 'product_warehouse_stock', 'stock_transfers'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    FOR policy_name IN
      SELECT pol.policyname
      FROM pg_policies AS pol
      WHERE pol.schemaname = 'public' AND pol.tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (organization_id = public.get_org_id() OR (organization_id IS NULL AND user_id = auth.uid()))',
      table_name || ' tenant select', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((organization_id IS NOT NULL AND organization_id = public.get_org_id()) OR (organization_id IS NULL AND user_id = auth.uid()))',
      table_name || ' tenant insert', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.get_org_id() OR (organization_id IS NULL AND user_id = auth.uid())) WITH CHECK ((organization_id IS NOT NULL AND organization_id = public.get_org_id()) OR (organization_id IS NULL AND user_id = auth.uid()))',
      table_name || ' tenant update', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (organization_id = public.get_org_id() OR (organization_id IS NULL AND user_id = auth.uid()))',
      table_name || ' tenant delete', table_name
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
