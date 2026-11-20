'use server';

// Server action WhatsApp yang dipanggil dari client component.
// Setiap aksi memeriksa hak akses sendiri karena server action dapat
// dipanggil langsung lewat POST. Logika pengiriman ada di lib/wa/notifications.ts.

import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser, getCurrentUser } from '@/lib/auth-guards';
import {
  notifyAdminOnDepositReported as notifyAdminOnDepositReportedInternal,
  sendManualReminderWA as sendManualReminderWAInternal,
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
