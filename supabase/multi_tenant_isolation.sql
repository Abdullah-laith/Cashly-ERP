-- Cashly ERP: isolate business data per authenticated user.
-- Run this whole file once in Supabase SQL Editor.
-- SQL files in GitHub/Vercel are not executed automatically.

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customers','suppliers','warehouses','brands','categories','unit_templates',
    'products','product_warehouse_stock','invoices','invoice_items','sales_invoices',
    'purchases','expenses','treasuries','vouchers','installments','installment_items',
    'chart_of_accounts','journal_entries','journal_entry_lines','ledger'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE', table_name);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', table_name);
      EXECUTE format('UPDATE public.%I SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) WHERE user_id IS NULL', table_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

      -- RLS policies are OR-ed together. Remove every legacy policy, regardless of name.
      FOR policy_name IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
      END LOOP;

      EXECUTE format('CREATE POLICY "cashly user select" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', table_name);
      EXECUTE format('CREATE POLICY "cashly user insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', table_name);
      EXECUTE format('CREATE POLICY "cashly user update" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', table_name);
      EXECUTE format('CREATE POLICY "cashly user delete" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', table_name);
    END IF;
  END LOOP;
END $$;

-- Apply the same complete policy reset to project settings.
DO $$
DECLARE
  policy_name text;
BEGIN
  IF to_regclass('public.organization_settings') IS NOT NULL THEN
    ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'organization_settings'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.organization_settings', policy_name);
    END LOOP;

    CREATE POLICY "cashly settings select" ON public.organization_settings
      FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "cashly settings insert" ON public.organization_settings
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    CREATE POLICY "cashly settings update" ON public.organization_settings
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    CREATE POLICY "cashly settings delete" ON public.organization_settings
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
