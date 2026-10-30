-- ==============================================================================
-- STAGING DUMMY SEED DATA (DO NOT RUN ON PRODUCTION)
-- Purpose: Populate makt-qurban-staging with dummy test data only.
-- Zero personal data, zero real phone numbers, zero real balances.
-- ==============================================================================

-- 1. Program Settings (Dummy)
INSERT INTO public.program_settings (id, target_amount, qurban_date, is_open)
VALUES (1, 100000000, (now() + interval '180 days')::date, true)
ON CONFLICT (id) DO UPDATE 
SET qurban_date = EXCLUDED.qurban_date, is_open = true;

-- 2. WhatsApp Settings for Staging (Dry run true by default for safety)
INSERT INTO public.whatsapp_settings (id, is_enabled, dry_run, updated_at)
VALUES (1, true, false, now())
ON CONFLICT (id) DO UPDATE 
SET is_enabled = true, dry_run = false;

-- Note for Staging Operator:
-- Dummy users should be registered via standard Auth signup or the Next.js /register UI
-- with synthetic emails such as: 628999999001@qurban.makt.id
