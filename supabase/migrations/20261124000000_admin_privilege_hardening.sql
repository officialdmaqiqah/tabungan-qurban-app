-- =========================================================================
-- MIGRATION: pembagian wewenang admin (hasil audit ulang)
-- Aman dijalankan berulang kali (idempoten).
-- =========================================================================

-- 0. Fungsi bantu: apakah pengguna saat ini Super Admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- 1. TRANSAKSI: tidak ada yang boleh mengubah/menghapus transaksi langsung lewat API.
--    Aplikasi memverifikasi/menolak/menghapus transaksi lewat server (dengan Audit Log).
--    Sebelumnya admin bisa mengubah nominal transaksi terverifikasi tanpa jejak.
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON public.transactions FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM anon';
  END IF;
END
$$;

-- 2. REKENING RESMI: Admin/Bendahara & Super Admin boleh mengelola (keputusan pengurus).
--    Setiap perubahan tercatat otomatis di Audit Log (lihat bagian 4).
--    Jamaah (login) hanya melihat rekening aktif.
DROP POLICY IF EXISTS "Admin full access to bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Read bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Super admin manages bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins manage bank accounts" ON public.bank_accounts;

CREATE POLICY "Read bank accounts" ON public.bank_accounts
  FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage bank accounts" ON public.bank_accounts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. PENGATURAN PROGRAM: Admin/Bendahara & Super Admin (dengan Audit Log)
DROP POLICY IF EXISTS "Admins can update program settings" ON public.program_settings;
DROP POLICY IF EXISTS "Admins can insert program settings" ON public.program_settings;
DROP POLICY IF EXISTS "Super admin can update program settings" ON public.program_settings;
DROP POLICY IF EXISTS "Super admin can insert program settings" ON public.program_settings;
CREATE POLICY "Admins can update program settings" ON public.program_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can insert program settings" ON public.program_settings
  FOR INSERT WITH CHECK (public.is_admin());

-- 4. JEJAK AUDIT otomatis untuk perubahan rekening & pengaturan program
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_details text;
  v_row record;
BEGIN
  -- Perubahan dari server (service role) sudah dicatat aplikasi sendiri
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_row := COALESCE(NEW, OLD);
  IF TG_TABLE_NAME = 'bank_accounts' THEN
    IF TG_OP = 'UPDATE' THEN
      v_details := format('Rekening diubah: %s %s a.n %s (aktif: %s) -> %s %s a.n %s (aktif: %s)',
        OLD.bank_name, OLD.account_number, OLD.account_name, OLD.is_active,
        NEW.bank_name, NEW.account_number, NEW.account_name, NEW.is_active);
    ELSE
      v_details := format('Rekening %s: %s %s a.n %s',
        CASE TG_OP WHEN 'INSERT' THEN 'ditambahkan' ELSE 'dihapus' END,
        v_row.bank_name, v_row.account_number, v_row.account_name);
    END IF;
  ELSE
    v_details := format('Pengaturan program diubah (%s)', TG_OP);
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (admin_id, action, target_id, details, created_at)
    VALUES (auth.uid(), CASE WHEN TG_TABLE_NAME = 'bank_accounts' THEN 'ubah rekening' ELSE 'ubah pengaturan' END,
            v_row.id, v_details, now());
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Audit log gagal dicatat: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS log_bank_accounts_change ON public.bank_accounts;
CREATE TRIGGER log_bank_accounts_change
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();

DROP TRIGGER IF EXISTS log_program_settings_change ON public.program_settings;
CREATE TRIGGER log_program_settings_change
  AFTER INSERT OR UPDATE ON public.program_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();
