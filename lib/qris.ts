// Server-only: pengaturan gambar QRIS resmi untuk setoran.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const QRIS_BUCKET = 'public-assets';

export interface QrisSetting {
  path: string;
  /** Penanda versi untuk URL gambar (berubah setiap kali QRIS diganti). */
  version: string;
}

/** Mengembalikan QRIS aktif, atau null bila admin belum mengunggah (atau migrasi belum dijalankan). */
export async function getQrisSetting(): Promise<QrisSetting | null> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('program_settings')
      .select('qris_image_path, qris_updated_at')
      .limit(1)
      .maybeSingle();
    if (error || !data?.qris_image_path) return null;
    const version = data.qris_updated_at ? String(new Date(data.qris_updated_at).getTime()) : '1';
    return { path: data.qris_image_path, version };
  } catch {
    return null;
  }
}
