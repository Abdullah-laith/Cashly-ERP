-- Cashly ERP: idempotent SaaS onboarding schema update.
-- Run in Supabase SQL Editor. Safe to run more than once.

-- The current application reads and writes the single-row organization_settings table.
-- Keep the existing table shape and add onboarding fields without replacing old columns.
ALTER TABLE IF EXISTS public.organization_settings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS sales_channel TEXT,
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'IQD',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 days'),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';

-- The legacy schema used organization_id as the primary key. The current app
-- uses one settings row per auth user, so make user_id the real conflict key.
-- This is intentionally a table constraint (not a partial index), because
-- PostgREST upsert(onConflict: 'user_id') must be able to infer it.
ALTER TABLE public.organization_settings
  DROP CONSTRAINT IF EXISTS organization_settings_pkey;
ALTER TABLE public.organization_settings
  ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.organization_settings
  DROP CONSTRAINT IF EXISTS organization_settings_user_id_key;
DROP INDEX IF EXISTS public.organization_settings_user_id_key;
ALTER TABLE public.organization_settings
  ADD CONSTRAINT organization_settings_user_id_key UNIQUE (user_id);

-- Backfill only NULL values. Existing user choices are preserved on re-runs.
UPDATE public.organization_settings
SET default_currency = 'IQD'
WHERE default_currency IS NULL;

UPDATE public.organization_settings
SET onboarding_completed = FALSE
WHERE onboarding_completed IS NULL;

UPDATE public.organization_settings
SET trial_starts_at = NOW()
WHERE trial_starts_at IS NULL;

UPDATE public.organization_settings
SET trial_ends_at = trial_starts_at + INTERVAL '10 days'
WHERE trial_ends_at IS NULL;

UPDATE public.organization_settings
SET subscription_status = 'trial'
WHERE subscription_status IS NULL;

-- Validate the onboarding enum-like fields for future writes without failing because
-- an older installation may already contain rows. Constraints are added once only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_settings_sales_channel_check'
      AND conrelid = 'public.organization_settings'::regclass
  ) THEN
    ALTER TABLE public.organization_settings
      ADD CONSTRAINT organization_settings_sales_channel_check
      CHECK (sales_channel IS NULL OR sales_channel IN ('online', 'physical', 'both')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_settings_subscription_status_check'
      AND conrelid = 'public.organization_settings'::regclass
  ) THEN
    ALTER TABLE public.organization_settings
      ADD CONSTRAINT organization_settings_subscription_status_check
      CHECK (subscription_status IS NULL OR subscription_status IN ('trial', 'active', 'expired')) NOT VALID;
  END IF;
END $$;

-- Keep the settings table protected while preserving the current app's authenticated
-- single-organization access model. DROP/CREATE makes this block re-runnable.
ALTER TABLE IF EXISTS public.organization_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saas authenticated settings select" ON public.organization_settings;
DROP POLICY IF EXISTS "saas authenticated settings insert" ON public.organization_settings;
DROP POLICY IF EXISTS "saas authenticated settings update" ON public.organization_settings;
DROP POLICY IF EXISTS "saas authenticated settings delete" ON public.organization_settings;

CREATE POLICY "saas authenticated settings select"
  ON public.organization_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "saas authenticated settings insert"
  ON public.organization_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "saas authenticated settings update"
  ON public.organization_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "saas authenticated settings delete"
  ON public.organization_settings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create the public logo bucket once. The ON CONFLICT clause avoids duplicate errors.
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public bucket reads are available through Supabase's public object URL. These
-- policies also allow authenticated clients to list/read, upload, and update logos.
DROP POLICY IF EXISTS "company logos authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "company logos authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "company logos authenticated update" ON storage.objects;

CREATE POLICY "company logos authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');
CREATE POLICY "company logos authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos');
CREATE POLICY "company logos authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');

NOTIFY pgrst, 'reload schema';
