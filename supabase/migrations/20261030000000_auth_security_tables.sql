-- ==============================================================================
-- MIGRATION: AUTH SECURITY HARDENING TABLES (STAGING)
-- Date: 2026-10-30
-- Target Environment: Staging (DO NOT RUN DIRECTLY ON LIVE PRODUCTION)
-- Purpose: Persistent anti-replay for GoTrue Send SMS Webhook, atomic concurrency
--          control, and distributed rate limiting across serverless instances.
-- ==============================================================================

-- 1. Table: auth_webhook_claims (Anti-Replay & Atomic Claim Processing)
CREATE TABLE IF NOT EXISTS public.auth_webhook_claims (
  webhook_id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('processing', 'sent', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Index for efficient cleanup of expired claims
CREATE INDEX IF NOT EXISTS idx_auth_webhook_claims_expires 
ON public.auth_webhook_claims (expires_at);

-- RLS: Only Service Role can access this table
ALTER TABLE public.auth_webhook_claims ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auth_webhook_claims' AND policyname = 'Deny public access to auth_webhook_claims'
  ) THEN
    CREATE POLICY "Deny public access to auth_webhook_claims" 
    ON public.auth_webhook_claims FOR ALL TO public USING (false);
  END IF;
END $$;


-- 2. Table: auth_rate_limits (Distributed Concurrency & Rate Limiting)
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key text PRIMARY KEY,
  attempts integer DEFAULT 1 NOT NULL,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_expires 
ON public.auth_rate_limits (expires_at);

-- RLS: Only Service Role can access this table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auth_rate_limits' AND policyname = 'Deny public access to auth_rate_limits'
  ) THEN
    CREATE POLICY "Deny public access to auth_rate_limits" 
    ON public.auth_rate_limits FOR ALL TO public USING (false);
  END IF;
END $$;


-- 3. Stored Procedure: Atomic Webhook Claim & Stuck Recovery
CREATE OR REPLACE FUNCTION public.claim_auth_webhook(
  p_webhook_id text,
  p_ttl_seconds integer DEFAULT 600
)
RETURNS TABLE (
  claimed boolean,
  current_status text,
  is_retryable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Cleanup expired records older than 1 hour on call
  DELETE FROM public.auth_webhook_claims WHERE expires_at < now() - interval '1 hour';

  -- Attempt to insert new claim atomically
  INSERT INTO public.auth_webhook_claims (webhook_id, status, expires_at)
  VALUES (p_webhook_id, 'processing', now() + (p_ttl_seconds || ' seconds')::interval)
  ON CONFLICT (webhook_id) DO NOTHING;

  IF FOUND THEN
    -- Successfully claimed new message!
    RETURN QUERY SELECT true, 'processing'::text, false;
    RETURN;
  END IF;

  -- If conflict, retrieve existing state
  SELECT status, updated_at INTO v_existing
  FROM public.auth_webhook_claims
  WHERE webhook_id = p_webhook_id;

  IF v_existing.status = 'sent' THEN
    -- Already successfully delivered, reject replay (idempotent success signal)
    RETURN QUERY SELECT false, 'sent'::text, false;
  ELSIF v_existing.status = 'failed' AND (now() - v_existing.updated_at) > interval '10 seconds' THEN
    -- Previous attempt failed and cooldown elapsed, allow safe retry
    UPDATE public.auth_webhook_claims
    SET status = 'processing', updated_at = now()
    WHERE webhook_id = p_webhook_id;
    RETURN QUERY SELECT true, 'processing'::text, true;
  ELSIF v_existing.status = 'processing' AND (now() - v_existing.updated_at) > interval '45 seconds' THEN
    -- Stuck processing claim recovery: node crashed or gateway timeout without callback
    UPDATE public.auth_webhook_claims
    SET status = 'processing', updated_at = now(), error_message = 'Recovered from stuck processing state'
    WHERE webhook_id = p_webhook_id;
    RETURN QUERY SELECT true, 'processing'::text, true;
  ELSE
    -- Currently actively processing or within backoff
    RETURN QUERY SELECT false, v_existing.status::text, false;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_auth_webhook(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_auth_webhook(text, integer) TO service_role;


-- 4. Stored Procedure: Atomic Distributed Rate Limiting & Throttling
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  current_attempts integer,
  remaining_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_existing RECORD;
BEGIN
  -- Cleanup expired limits
  DELETE FROM public.auth_rate_limits WHERE expires_at < v_now;

  SELECT attempts, locked_until, expires_at INTO v_existing
  FROM public.auth_rate_limits
  WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO public.auth_rate_limits (key, attempts, locked_until, created_at, updated_at, expires_at)
    VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval, v_now, v_now, v_now + (p_window_seconds || ' seconds')::interval);
    RETURN QUERY SELECT true, 1, p_window_seconds;
    RETURN;
  END IF;

  IF v_existing.attempts >= p_max_attempts THEN
    -- Limit exceeded!
    RETURN QUERY SELECT false, v_existing.attempts, GREATEST(0, EXTRACT(EPOCH FROM (v_existing.expires_at - v_now))::integer);
    RETURN;
  END IF;

  -- Increment attempts atomically
  UPDATE public.auth_rate_limits
  SET attempts = auth_rate_limits.attempts + 1, updated_at = v_now
  WHERE key = p_key;

  RETURN QUERY SELECT true, v_existing.attempts + 1, GREATEST(0, EXTRACT(EPOCH FROM (v_existing.expires_at - v_now))::integer);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO service_role;
