-- =========================================================================
-- MIGRATION: gambar QRIS resmi untuk setoran tabungan
-- Aman dijalankan berulang kali (idempoten).
-- =========================================================================

-- 1. Lokasi file QRIS yang aktif (diunggah admin lewat menu Pengaturan)
ALTER TABLE public.program_settings
  ADD COLUMN IF NOT EXISTS qris_image_path text,
  ADD COLUMN IF NOT EXISTS qris_updated_at timestamptz;

-- 2. Bucket penyimpanan aset publik (gambar QRIS).
--    public = true: gambar bisa dibaca siapa saja (QRIS memang untuk dibagikan).
--    Tidak ada policy tulis: hanya server (secret key / service role) yang bisa mengunggah.
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;
