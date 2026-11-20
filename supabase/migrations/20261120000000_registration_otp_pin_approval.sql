-- =========================================================================
-- MIGRATION: verifikasi OTP WhatsApp, login PIN, dan persetujuan admin
-- Aman dijalankan berulang kali (idempoten).
-- =========================================================================

-- 1. Status persetujuan akun jamaah ----------------------------------------
--    Akun yang SUDAH ADA dianggap disetujui. Akun baru mulai sebagai 'pending'.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_note text,
  ADD COLUMN IF NOT EXISTS pin_set_at timestamptz;

-- Setelah kolom terisi 'approved' untuk akun lama, default untuk akun baru = 'pending'
ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'pending';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Admin dan super admin selalu dianggap disetujui
UPDATE public.profiles SET approval_status = 'approved'
WHERE role IN ('admin', 'super_admin') AND approval_status <> 'approved';

-- 2. Pengguna tidak boleh mengubah role, id, maupun status persetujuannya sendiri
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
       NEW.role IS DISTINCT FROM OLD.role
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
    OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.approval_note IS DISTINCT FROM OLD.approval_note
    OR NEW.pin_set_at IS DISTINCT FROM OLD.pin_set_at
  ) THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah role, id, atau status persetujuan profil'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_change();

-- 3. Setoran hanya bisa dilaporkan oleh akun yang sudah disetujui ------------
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND verified_at IS NULL
    AND verified_by IS NULL
    AND admin_note IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.approval_status = 'approved'
    )
  );

-- 4. Kode OTP WhatsApp (hanya diakses server / service role) ---------------
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('register', 'reset_pin')),
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  request_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_otps_phone_purpose_idx ON public.phone_otps (phone, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS phone_otps_ip_idx ON public.phone_otps (request_ip, created_at DESC);

-- 5. Percobaan login PIN (untuk kunci otomatis) ----------------------------
CREATE TABLE IF NOT EXISTS public.login_attempts (
  phone text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Cari id akun dari email login (hanya untuk server / service role) ------
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) TO service_role';
  END IF;
END
$$;

-- RLS aktif tanpa policy = tidak bisa dibaca/ditulis lewat publishable/anon key.
-- Server memakai secret key (service role) yang melewati RLS.
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.phone_otps FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON public.login_attempts FROM anon, authenticated';
  END IF;
END
$$;

-- =========================================================================
-- QUERY MANUAL (opsional, jalankan sendiri bila perlu)
-- =========================================================================
-- a) Daftar pendaftar yang menunggu persetujuan:
--    SELECT id, full_name, phone_normalized, created_at FROM public.profiles
--    WHERE approval_status = 'pending' ORDER BY created_at;
--
-- b) Membuka kunci login PIN untuk satu nomor:
--    DELETE FROM public.login_attempts WHERE phone = '62812xxxxxxx';
--
-- c) Membersihkan kode OTP lama (lebih dari 7 hari):
--    DELETE FROM public.phone_otps WHERE created_at < now() - interval '7 days';
--
-- d) Akun yang email loginnya TIDAK berformat nomor 62xxx@qurban.makt.id
--    (akun seperti ini tidak bisa memakai "Buat PIN"; laporkan ke pengembang):
--    SELECT u.id, u.email, p.full_name, p.role FROM auth.users u
--    LEFT JOIN public.profiles p ON p.id = u.id
--    WHERE u.email !~ '^62[0-9]{8,13}@qurban\.makt\.id$';
