'use server';

import { getAdminUser } from '@/lib/auth-guards';
import { sendWhatsAppMessageInternal, type WhatsAppParams } from '@/lib/wa/send';

/**
 * Kirim pesan WhatsApp bebas (dipakai form uji coba di /admin/whatsapp).
 * KEAMANAN: hanya admin/super_admin. Tanpa pemeriksaan ini siapa pun bisa
 * mengirim pesan apa saja ke nomor mana saja lewat gateway WA MAKT.
 */
export async function sendWhatsAppMessage(params: WhatsAppParams) {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error('Akses ditolak: hanya admin yang dapat mengirim pesan WhatsApp.');
  }
  if (!params || typeof params.to !== 'string' || typeof params.message !== 'string') {
    throw new Error('Data pesan tidak valid.');
  }
  return sendWhatsAppMessageInternal(params);
}
