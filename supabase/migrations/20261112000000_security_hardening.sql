-- =========================================================================
-- MIGRATION: SECURITY HARDENING (role & transaksi)
-- Aman dijalankan berulang kali (idempoten).
-- =========================================================================

-- 1. Cegah pengguna mengubah role (atau id) profilnya sendiri.
--    Request dari pengguna yang login (auth.uid() tidak null) ditolak jika
--    mengubah kolom role/id. Service role & SQL Editor (auth.uid() null)
--    tetap boleh, sehingga Super Admin melalui server action tetap berfungsi.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah role atau id profil'
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

-- 2. Policy update profil sendiri: USING + WITH CHECK.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Jamaah hanya boleh membuat transaksi berstatus 'pending' tanpa data verifikasi.
--    (Setoran tunai oleh admin memakai service role, jadi tidak terpengaruh.)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND verified_at IS NULL
    AND verified_by IS NULL
    AND admin_note IS NULL
  );

-- =========================================================================
-- QUERY MANUAL (jalankan sendiri di SQL Editor; tidak dieksekusi otomatis)
-- =========================================================================
--
-- a) Daftar akun admin / super_admin saat ini:
--    SELECT id, full_name, phone, role, created_at
--    FROM public.profiles
--    WHERE role IN ('admin', 'super_admin')
--    ORDER BY role, full_name;
--
-- b) Menetapkan Super Admin yang sah (ganti <uuid>):
--    UPDATE public.profiles SET role = 'super_admin' WHERE id = '<uuid>';
--
-- c) Akun yang pernah menaruh role di user_metadata (indikasi percobaan
--    eskalasi lewat supabase.auth.updateUser):
--    SELECT u.id, u.phone, u.email, u.raw_user_meta_data->>'role' AS meta_role,
--           p.role AS profile_role, u.updated_at
--    FROM auth.users u
--    LEFT JOIN public.profiles p ON p.id = u.id
--    WHERE u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
--    ORDER BY u.updated_at DESC;
--
-- d) Transaksi berstatus verified tanpa verifikator (indikasi insert langsung
--    oleh jamaah sebelum policy diperketat):
--    SELECT id, user_id, amount, status, verified_at, verified_by, created_at
--    FROM public.transactions
--    WHERE status = 'verified' AND verified_by IS NULL
--    ORDER BY created_at DESC;
