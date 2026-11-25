-- Cashly ERP: isolate business data per authenticated user.
-- Run this whole file once in Supabase SQL Editor.
-- Do not run it from Vercel or GitHub; SQL files are not executed automatically.

DO $$
DECLARE
  table_name text;
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
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

      -- Existing data remains owned by the first/old account. New accounts start empty.
      EXECUTE format('UPDATE public.%I SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) WHERE user_id IS NULL', table_name);

      EXECUTE format('DROP POLICY IF EXISTS "authenticated all" ON public.%I', table_name);
      EXECUTE format('DROP POLICY IF EXISTS "user data select" ON public.%I', table_name);
      EXECUTE format('DROP POLICY IF EXISTS "user data insert" ON public.%I', table_name);
      EXECUTE format('DROP POLICY IF EXISTS "user data update" ON public.%I', table_name);
      EXECUTE format('DROP POLICY IF EXISTS "user data delete" ON public.%I', table_name);

      EXECUTE format('CREATE POLICY "user data select" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', table_name);
      EXECUTE format('CREATE POLICY "user data insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', table_name);
      EXECUTE format('CREATE POLICY "user data update" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', table_name);
      EXECUTE format('CREATE POLICY "user data delete" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', table_name);
    END IF;
  END LOOP;
END $$;

-- Settings must also be private per account.
ALTER TABLE IF EXISTS public.organization_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated all" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.organization_settings;
DROP POLICY IF EXISTS "saas authenticated settings select" ON public.organization_settings;
DROP POLICY IF EXISTS "saas authenticated settings insert" ON public.organization_settings;
DROP POLICY IF EXISTS "saas authenticated settings update" ON public.organization_settings;
DROP POLICY IF EXISTS "saas authenticated settings delete" ON public.organization_settings;

CREATE POLICY "settings select own user" ON public.organization_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "settings insert own user" ON public.organization_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "settings update own user" ON public.organization_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "settings delete own user" ON public.organization_settings
  FOR DELETE TO authenticated USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
