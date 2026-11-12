-- =========================================================================
-- MIGRATION: policy admin juga mengizinkan super_admin
-- Beberapa policy lama memeriksa profiles.role = 'admin' secara persis,
-- sehingga akun super_admin ditolak RLS. Semua diarahkan ke public.is_admin().
-- Aman dijalankan berulang kali (idempoten). Perintah policy (SELECT/INSERT/
-- ALL) tidak diubah karena memakai ALTER POLICY.
-- =========================================================================

-- Pastikan is_admin() mengenali admin dan super_admin
-- (sama dengan migrasi 20261029000000, diulang agar file ini mandiri).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename, policyname) IN (
        ('bank_accounts',          'Admin full access to bank_accounts'),
        ('audit_logs',             'Admins can view audit logs'),
        ('audit_logs',             'Admins can insert audit logs'),
        ('whatsapp_settings',      'Admins can manage whatsapp settings'),
        ('whatsapp_notifications', 'Admins can view all logs'),
        ('whatsapp_notifications', 'Admins can read whatsapp logs')
      )
  LOOP
    IF p.cmd = 'INSERT' THEN
      EXECUTE format(
        'ALTER POLICY %I ON public.%I WITH CHECK (public.is_admin())',
        p.policyname, p.tablename);
    ELSIF p.cmd IN ('ALL', 'UPDATE') THEN
      EXECUTE format(
        'ALTER POLICY %I ON public.%I USING (public.is_admin()) WITH CHECK (public.is_admin())',
        p.policyname, p.tablename);
    ELSE
      EXECUTE format(
        'ALTER POLICY %I ON public.%I USING (public.is_admin())',
        p.policyname, p.tablename);
    END IF;
  END LOOP;
END
$$;

-- Cek ulang: query ini seharusnya tidak lagi mengembalikan policy yang
-- memeriksa role = 'admin' secara persis.
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND (qual LIKE '%''admin''::text%' OR with_check LIKE '%''admin''::text%');
