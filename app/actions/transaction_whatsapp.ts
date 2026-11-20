'use server';

// Server action WhatsApp yang dipanggil dari client component.
// Setiap aksi memeriksa hak akses sendiri karena server action dapat
// dipanggil langsung lewat POST. Logika pengiriman ada di lib/wa/notifications.ts.

import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser, getCurrentUser, getRecentlyRegisteredUser } from '@/lib/auth-guards';
import {
  notifyAdminOnDepositReported as notifyAdminOnDepositReportedInternal,
  sendManualReminderWA as sendManualReminderWAInternal,
  sendRegistrationWelcomeWA as sendRegistrationWelcomeWAInternal,
} from '@/lib/wa/notifications';

/** Dipanggil jamaah setelah melapor setoran. Hanya untuk transaksi pending miliknya sendiri. */
export async function notifyAdminOnDepositReported(txId: string) {
  const user = await getCurrentUser();
  if (!user || !txId || typeof txId !== 'string') return;

  const adminClient = createAdminClient();
  const { data: tx } = await adminClient
    .from('transactions')
    .select('user_id, status')
    .eq('id', txId)
    .single();

  if (!tx || tx.user_id !== user.id || tx.status !== 'pending') return;

  // Cegah notifikasi ganda untuk transaksi yang sama
  const { count } = await adminClient
    .from('whatsapp_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('related_transaction_id', txId)
    .eq('event_type', 'deposit_reported_admin');
  if (count && count > 0) return;

  await notifyAdminOnDepositReportedInternal(txId);
}

/** Pengingat manual dari halaman detail jamaah. Hanya admin/super_admin. */
export async function sendManualReminderWA(userId: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: 'Akses ditolak: hanya admin yang dapat mengirim pengingat.' };
  }
  return sendManualReminderWAInternal(userId);
}

/**
 * Pesan selamat datang setelah pendaftaran (dipanggil sebelum pengguna login).
 * KEAMANAN: nomor tujuan & opt-in diambil dari profil di database, bukan dari
 * parameter client; hanya untuk akun yang baru dibuat dan hanya sekali.
 * Parameter `_phone` dan `_waOptIn` dipertahankan agar pemanggil lama tetap kompatibel.
 */
export async function sendRegistrationWelcomeWA(
  userId: string,
  _phone?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  _waOptIn?: boolean // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const newUser = await getRecentlyRegisteredUser(userId);
  if (!newUser) {
    return { success: false, error: 'Akun tidak valid untuk pesan pendaftaran.' };
  }

  const adminClient = createAdminClient();
  const { count } = await adminClient
    .from('whatsapp_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .eq('event_type', 'registration_welcome_jamaah');
  if (count && count > 0) {
    return { success: false, error: 'Pesan pendaftaran sudah pernah diproses.' };
  }

  return sendRegistrationWelcomeWAInternal(userId);
}
