-- =========================================================================
-- MIGRATION: perbaikan audit ke-3
-- Aman dijalankan berulang kali (idempoten).
-- =========================================================================

-- 1. LAPOR SETORAN: bukti transfer wajib file milik pelapor sendiri di bucket "proofs".
--    Sebelumnya proof_url bisa diisi alamat situs lain (mis. halaman login palsu)
--    yang kemudian diklik admin lewat tombol "Lihat Bukti".
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND verified_at IS NULL
    AND verified_by IS NULL
    AND admin_note IS NULL
    AND (
      proof_url IS NULL
      OR (proof_url LIKE 'proofs/' || auth.uid()::text || '/%' AND position('..' IN proof_url) = 0)
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.approval_status = 'approved'
    )
  );

-- 2. Sisa fitur login SMS dari branch "staging" (tidak dipakai aplikasi)
DROP FUNCTION IF EXISTS public.claim_auth_webhook(text, integer);
DROP FUNCTION IF EXISTS public.check_and_increment_rate_limit(text, integer, integer);
DROP TABLE IF EXISTS public.auth_webhook_claims;
DROP TABLE IF EXISTS public.auth_rate_limits;

-- 3. Notifikasi "pendaftar baru" untuk admin jangan tercatat atas nama jamaah
--    (jamaah bisa membaca log miliknya, termasuk nomor WA admin)
UPDATE public.whatsapp_notifications
SET recipient_user_id = NULL
WHERE event_type = 'registration_pending_admin' AND recipient_user_id IS NOT NULL;

-- =========================================================================
-- CEK (opsional): fungsi "security definer" di schema public yang bisa
-- dipanggil pengguna tanpa login (anon). Seharusnya hanya is_admin dan
-- is_super_admin (aman: hanya mengembalikan true/false).
--   SELECT p.proname AS fungsi
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef
--     AND has_function_privilege('anon', p.oid, 'EXECUTE')
--   ORDER BY 1;
-- =========================================================================
