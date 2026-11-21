-- =========================================================================
-- MIGRATION: perbaikan hasil audit keamanan (22 Nov 2026)
-- Aman dijalankan berulang kali (idempoten).
-- =========================================================================

-- 1. PROFIL: jamaah hanya boleh mengubah "mode privasi" (is_anonymous) miliknya.
--    Sebelumnya jamaah bisa mengubah sendiri nama, alamat, dan nomor WA lewat API
--    (mis. mengganti phone_normalized ke nomor orang lain sehingga notifikasi WA
--    terkirim ke orang tersebut, atau mengganti nama setelah disetujui admin).
--    Perubahan data lain tetap bisa dilakukan admin lewat aplikasi (server).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE UPDATE ON public.profiles FROM authenticated';
    EXECUTE 'GRANT UPDATE (is_anonymous) ON public.profiles TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon';
  END IF;
END
$$;

-- 2. PAKET PILIHAN: paket yang sudah dipilih "terkunci" (sesuai tampilan aplikasi).
--    Sebelumnya jamaah bisa menghapus paketnya sendiri lewat API dan memilih
--    jumlah berapa pun (termasuk 0/negatif) sehingga target & progres kacau.
DROP POLICY IF EXISTS "Users can delete own selected packages" ON public.user_packages;

ALTER TABLE public.user_packages DROP CONSTRAINT IF EXISTS user_packages_quantity_check;
-- NOT VALID: data lama tidak diperiksa ulang, tetapi data baru/diubah wajib 1-20
ALTER TABLE public.user_packages
  ADD CONSTRAINT user_packages_quantity_check CHECK (quantity BETWEEN 1 AND 20) NOT VALID;

DROP POLICY IF EXISTS "Users can insert own selected packages" ON public.user_packages;
CREATE POLICY "Users can insert own selected packages" ON public.user_packages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND quantity BETWEEN 1 AND 20);

-- 3. BUKTI TRANSFER: batasi ukuran & jenis file di sisi server (bukan hanya di browser)
UPDATE storage.buckets
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'proofs';

-- Gambar QRIS (admin) maksimal 3 MB, hanya gambar
UPDATE storage.buckets
SET file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'public-assets';

-- =========================================================================
-- QUERY PENGECEKAN (jalankan sendiri, lalu kirim hasilnya bila ada yang janggal)
-- =========================================================================
-- a) Tabel di schema public yang RLS-nya MATI (seharusnya hasilnya kosong):
--    SELECT c.relname AS tabel
--    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
--
-- b) Semua policy yang mengizinkan akses publik/semua pengguna (periksa satu per satu):
--    SELECT tablename, policyname, cmd, roles, qual, with_check
--    FROM pg_policies
--    WHERE schemaname IN ('public', 'storage')
--      AND (qual = 'true' OR with_check = 'true' OR qual IS NULL AND cmd <> 'INSERT')
--    ORDER BY tablename;
--
-- c) Akun yang BELUM membuat PIN (masih memakai password lama):
--    SELECT p.full_name, p.phone_normalized, p.role, p.created_at
--    FROM public.profiles p WHERE p.pin_set_at IS NULL ORDER BY p.role, p.full_name;
--
-- d) (OPSIONAL, setelah masa transisi selesai) Matikan password lama akun yang
--    belum membuat PIN. Akun tersebut tetap bisa masuk lewat "Buat PIN / Lupa PIN".
--    UPDATE auth.users u SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
--    FROM public.profiles p WHERE p.id = u.id AND p.pin_set_at IS NULL;
