-- =========================================================================
-- MIGRATION: UPDATE ROLE MANAGEMENT TABUNGAN QURBAN MAKT
-- =========================================================================
-- Tujuan:
-- 1. Mengizinkan role 'super_admin' di database tabel profiles.
-- 2. Memperbarui fungsi keamanan RLS is_admin() untuk mengizinkan 'admin' dan 'super_admin'.
-- 3. Memastikan semua policy RLS berjalan mulus bagi Admin/Bendahara dan Super Admin.
-- =========================================================================

-- 1. Perbarui CHECK constraint pada profiles.role agar mengizinkan ('jamaah', 'admin', 'super_admin')
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('jamaah', 'admin', 'super_admin'));

-- 2. Perbarui fungsi is_admin() agar mengenali 'admin' dan 'super_admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- 3. Pastikan RLS Policies Profiles menggunakan fungsi is_admin()
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- 4. Pastikan RLS Policies Program Settings menggunakan fungsi is_admin()
DROP POLICY IF EXISTS "Admins can update program settings" ON public.program_settings;
CREATE POLICY "Admins can update program settings" ON public.program_settings FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert program settings" ON public.program_settings;
CREATE POLICY "Admins can insert program settings" ON public.program_settings FOR INSERT WITH CHECK (public.is_admin());

-- 5. Pastikan RLS Policies Qurban Packages menggunakan fungsi is_admin()
DROP POLICY IF EXISTS "Admins can insert packages" ON public.qurban_packages;
CREATE POLICY "Admins can insert packages" ON public.qurban_packages FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update packages" ON public.qurban_packages;
CREATE POLICY "Admins can update packages" ON public.qurban_packages FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete packages" ON public.qurban_packages;
CREATE POLICY "Admins can delete packages" ON public.qurban_packages FOR DELETE USING (public.is_admin());

-- 6. Pastikan RLS Policies Transactions menggunakan fungsi is_admin()
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE USING (public.is_admin());

-- 7. Pastikan RLS Policies Storage Proofs menggunakan fungsi is_admin()
DROP POLICY IF EXISTS "Admins can view all proofs" ON storage.objects;
CREATE POLICY "Admins can view all proofs" ON storage.objects FOR SELECT USING (
  bucket_id = 'proofs' AND public.is_admin()
);
