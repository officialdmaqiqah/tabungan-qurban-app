'use server';

import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from './whatsapp';
import { formatCurrency } from '@/lib/utils';

export async function notifyAdminOnDepositReported(txId: string) {
  try {
    const supabase = await createClient();

    // Fetch transaction & profile
    const { data: tx } = await supabase
      .from('transactions')
      .select('*, profiles!transactions_user_id_fkey(full_name)')
      .eq('id', txId)
      .single();

    if (!tx) return;

    // Fetch settings
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('send_to_admin_on_deposit_reported, admin_notification_phone')
      .single();

    if (!settings?.send_to_admin_on_deposit_reported || !settings?.admin_notification_phone) {
      return;
    }

    const message = `Assalamu'alaikum Admin MAKT.

Ada laporan setoran baru:

Nama: Bpk/Ibu ${tx.profiles?.full_name || 'Hamba Allah'}
Nominal: ${formatCurrency(tx.amount)}
Metode: ${tx.method}
Status: Pending

Silakan cek dashboard admin untuk verifikasi:
https://tabunganqurban.kubahtimah.com/admin/verifikasi`;

    await sendWhatsAppMessage({
      to: settings.admin_notification_phone,
      message: message,
      eventType: 'deposit_reported_admin',
      relatedTransactionId: tx.id
    });
  } catch (error) {
    console.error('Error notifyAdminOnDepositReported:', error);
  }
}

export async function notifyJamaahOnDepositApproved(txId: string) {
  try {
    const supabase = await createClient();

    // Fetch transaction & profile
    const { data: tx } = await supabase
      .from('transactions')
      .select('*, profiles!transactions_user_id_fkey(full_name, phone_normalized, wa_opt_in)')
      .eq('id', txId)
      .single();

    if (!tx || !tx.profiles) return;

    // Check opt-in & phone
    if (!tx.profiles.wa_opt_in || !tx.profiles.phone_normalized) {
      await logSkipped(txId, tx.profiles.id, tx.profiles.phone_normalized, 'wa_opt_in_false or empty phone', 'deposit_approved_jamaah');
      return;
    }

    // Fetch settings
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('send_to_jamaah_on_deposit_approved')
      .single();

    if (!settings?.send_to_jamaah_on_deposit_approved) return;

    // Calculate total savings and target
    const { data: allTxs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', tx.user_id)
      .eq('status', 'verified');
      
    const totalSavings = allTxs?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Get active package target
    let target = 0;
    const { data: activePkg } = await supabase
      .from('user_packages')
      .select('packages(price)')
      .eq('user_id', tx.user_id)
      .eq('status', 'active')
      .single();
      
    if (activePkg?.packages) {
      const pkg: any = Array.isArray(activePkg.packages) ? activePkg.packages[0] : activePkg.packages;
      if (pkg?.price) {
        target = pkg.price;
      }
    }

    const progress = target > 0 ? Math.min(100, Math.round((totalSavings / target) * 100)) : 100;

    const message = `Assalamu'alaikum Bpk/Ibu ${tx.profiles.full_name}.

Alhamdulillah, setoran tabungan qurban Anda telah diverifikasi.

Nominal: ${formatCurrency(tx.amount)}
Total tabungan saat ini: ${formatCurrency(totalSavings)}
Target: ${target > 0 ? formatCurrency(target) : '-'}
Progress: ${progress}%

Semoga Allah mudahkan niat qurban Anda.

Cek dashboard:
https://tabunganqurban.kubahtimah.com/dashboard`;

    await sendWhatsAppMessage({
      to: tx.profiles.phone_normalized,
      message: message,
      eventType: 'deposit_approved_jamaah',
      recipientUserId: tx.user_id,
      relatedTransactionId: tx.id
    });
  } catch (error) {
    console.error('Error notifyJamaahOnDepositApproved:', error);
  }
}

export async function notifyJamaahOnDepositRejected(txId: string, adminNote: string) {
  try {
    const supabase = await createClient();

    // Fetch transaction & profile
    const { data: tx } = await supabase
      .from('transactions')
      .select('*, profiles!transactions_user_id_fkey(full_name, phone_normalized, wa_opt_in)')
      .eq('id', txId)
      .single();

    if (!tx || !tx.profiles) return;

    // Check opt-in & phone
    if (!tx.profiles.wa_opt_in || !tx.profiles.phone_normalized) {
      await logSkipped(txId, tx.profiles.id, tx.profiles.phone_normalized, 'wa_opt_in_false or empty phone', 'deposit_rejected_jamaah');
      return;
    }

    // Fetch settings
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('send_to_jamaah_on_deposit_rejected')
      .single();

    if (!settings?.send_to_jamaah_on_deposit_rejected) return;

    const message = `Assalamu'alaikum Bpk/Ibu ${tx.profiles.full_name}.

Mohon maaf, laporan setoran tabungan qurban Anda belum bisa diverifikasi.

Nominal: ${formatCurrency(tx.amount)}
Catatan admin: ${adminNote || 'Tidak ada catatan khusus.'}

Silakan cek kembali bukti setoran atau hubungi admin MAKT.

Dashboard:
https://tabunganqurban.kubahtimah.com/dashboard`;

    await sendWhatsAppMessage({
      to: tx.profiles.phone_normalized,
      message: message,
      eventType: 'deposit_rejected_jamaah',
      recipientUserId: tx.user_id,
      relatedTransactionId: tx.id
    });
  } catch (error) {
    console.error('Error notifyJamaahOnDepositRejected:', error);
  }
}

// Helper to log skipped messages without sending to provider
async function logSkipped(txId: string, userId: string, phone: string | null | undefined, reason: string, eventType: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('whatsapp_notifications').insert({
      recipient_user_id: userId,
      recipient_phone: phone || '-',
      event_type: eventType,
      message: 'Message skipped: ' + reason,
      status: 'skipped',
      error_message: reason,
      related_transaction_id: txId,
      created_by: user?.id || null,
    });
  } catch (err) {
    console.error('Failed to log skipped WA', err);
  }
}

export async function sendManualReminderWA(userId: string) {
  try {
    const supabase = await createClient();

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone_normalized, wa_opt_in, id')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('Profile not found');

    // Check opt-in & phone
    if (!profile.wa_opt_in || !profile.phone_normalized) {
      await logSkipped(null as any, profile.id, profile.phone_normalized, 'wa_opt_in_false or empty phone', 'manual_reminder');
      throw new Error('Jamaah belum opt-in WA atau nomor telepon kosong.');
    }

    // Calculate total savings and target
    const { data: allTxs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'verified');
      
    const totalSavings = allTxs?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    let target = 0;
    const { data: activePkg } = await supabase
      .from('user_packages')
      .select('packages(price)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
      
    if (activePkg?.packages) {
      const pkg: any = Array.isArray(activePkg.packages) ? activePkg.packages[0] : activePkg.packages;
      if (pkg?.price) {
        target = pkg.price;
      }
    }

    const sisaTarget = Math.max(0, target - totalSavings);

    const message = `Assalamu'alaikum Bpk/Ibu ${profile.full_name},

Semoga selalu dalam lindungan Allah SWT.
Kami dari Panitia Tabungan Qurban ingin mengingatkan bahwa waktu menuju Idul Adha semakin dekat.

- Saldo Saat Ini: ${formatCurrency(totalSavings)}
- Sisa Target: ${formatCurrency(sisaTarget)}

Yuk, tambah setoran Anda agar niat mulia berqurban tahun ini dapat terwujud tepat waktu. Terima kasih!`;

    await sendWhatsAppMessage({
      to: profile.phone_normalized,
      message: message,
      eventType: 'manual_reminder',
      recipientUserId: profile.id,
      relatedTransactionId: undefined
    });
    
    return { success: true, message: 'Reminder terkirim ke antrean.' };
  } catch (error: any) {
    console.error('Error sendManualReminderWA:', error);
    return { success: false, error: error.message };
  }
}

export async function sendRegistrationWelcomeWA(userId: string, phone: string, waOptIn: boolean) {
  try {
    if (!waOptIn) {
      await logSkipped(null as any, userId, phone, 'wa_opt_in_false', 'registration_welcome_jamaah');
      return { success: false, error: 'wa_opt_in_false' };
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('Profile not found');

    // We don't check settings.send_to_jamaah_on... here because user didn't specify a setting for this yet, 
    // or maybe they assume it's always enabled if WA is enabled. 
    // The prompt says "jika fitur WhatsApp notification aktif", which is handled by sendWhatsAppMessage (WA_NOTIF_ENABLED).

    const message = `Assalamu'alaikum Bpk/Ibu ${profile.full_name}.

Alhamdulillah, akun Tabungan Qurban MAKT Anda berhasil dibuat.

Silakan login melalui link berikut:
https://tabunganqurban.kubahtimah.com/login

Data login:
Username: ${phone}
Password: ***

Segera login dan pilih paket qurban yang Anda inginkan di dashboard.`;

    await sendWhatsAppMessage({
      to: phone,
      message: message,
      eventType: 'registration_welcome_jamaah',
      recipientUserId: userId
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sendRegistrationWelcomeWA:', error);
    return { success: false, error: error.message };
  }
}
