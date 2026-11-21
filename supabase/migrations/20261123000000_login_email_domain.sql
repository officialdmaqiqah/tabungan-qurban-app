-- =========================================================================
-- MIGRATION: pindahkan email internal akun ke domain milik masjid
--   <nomor>@qurban.makt.id  ->  <nomor>@akun.kubahtimah.com
--
-- Alasan: domain makt.id bukan milik masjid. Bila suatu saat Custom SMTP
-- diaktifkan, pemilik makt.id bisa menerima email "reset password"/"magic
-- link" untuk akun jamaah maupun admin. Email internal ini bukan alamat
-- sungguhan dan tidak pernah dipakai mengirim email.
--
-- PIN jamaah TIDAK berubah (rumus PIN tidak bergantung pada alamat email).
-- Aplikasi mengenali email lama maupun baru, jadi urutan deploy/SQL bebas.
-- Aman dijalankan berulang kali (idempoten). Tidak menyentuh akun lain.
-- =========================================================================

-- 1. Akun login
UPDATE auth.users u
SET email = split_part(u.email, '@', 1) || '@akun.kubahtimah.com',
    raw_user_meta_data = CASE
      WHEN u.raw_user_meta_data ? 'email'
        THEN jsonb_set(u.raw_user_meta_data, '{email}', to_jsonb(split_part(u.email, '@', 1) || '@akun.kubahtimah.com'))
      ELSE u.raw_user_meta_data
    END,
    updated_at = now()
WHERE lower(u.email) LIKE '%@qurban.makt.id'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users x
    WHERE lower(x.email) = lower(split_part(u.email, '@', 1) || '@akun.kubahtimah.com')
  );

-- 2. Identitas login (provider "email") ikut diperbarui
UPDATE auth.identities i
SET identity_data = jsonb_set(i.identity_data, '{email}', to_jsonb(u.email)),
    provider_id = CASE WHEN lower(i.provider_id) LIKE '%@qurban.makt.id' THEN u.email ELSE i.provider_id END,
    updated_at = now()
FROM auth.users u
WHERE i.user_id = u.id
  AND i.provider = 'email'
  AND lower(u.email) LIKE '%@akun.kubahtimah.com'
  AND lower(coalesce(i.identity_data->>'email', '')) LIKE '%@qurban.makt.id';

-- =========================================================================
-- CEK HASIL (jalankan setelahnya):
--   SELECT split_part(email, '@', 2) AS domain, count(*) FROM auth.users GROUP BY 1;
-- Seharusnya hanya tersisa domain akun.kubahtimah.com.
-- =========================================================================
