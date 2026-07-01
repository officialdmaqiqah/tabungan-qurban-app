'use server';

import { createClient } from '@/lib/supabase/server';

interface WhatsAppParams {
  to: string;
  message: string;
  eventType: string;
  recipientUserId?: string;
  relatedTransactionId?: string;
}

export async function sendWhatsAppMessage(params: WhatsAppParams) {
  const supabase = await createClient();

  // 1. Normalisasi nomor ke format 62
  let phone = params.to.replace(/\D/g, ''); // hapus karakter non-digit
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1);
  } else if (phone.startsWith('8')) {
    phone = '62' + phone;
  }
  // jika sudah mulai dengan 62 atau kode negara lain, biarkan saja

  // Ambil pengaturan dari DB
  const { data: settings } = await supabase
    .from('whatsapp_settings')
    .select('is_enabled, dry_run')
    .single();

  const isEnabledDB = settings?.is_enabled ?? false;
  const isDryRunDB = settings?.dry_run ?? true;

  const isEnabledEnv = process.env.WA_NOTIF_ENABLED === 'true';
  const isDryRunEnv = process.env.WA_DRY_RUN === 'true';

  const finalEnabled = isEnabledDB && isEnabledEnv;
  const finalDryRun = isDryRunDB || isDryRunEnv;

  let status = 'pending';
  let providerResponse = null;
  let errorMessage = null;

  // 2 & 3. Cek Status Aktif & Dry Run
  if (!finalEnabled) {
    status = 'skipped';
    errorMessage = 'System disabled in settings or env';
  } else if (finalDryRun) {
    status = 'skipped'; // Menggunakan skipped sesuai instruksi, atau bisa dry_run
    errorMessage = 'Dry run active (pesan tidak dikirim ke provider)';
  } else {
    // 4. Kirim ke XSender (Real)
    try {
      const xsenderUrl = process.env.XSENDER_API_URL;
      const xsenderKey = process.env.XSENDER_API_KEY;
      const xsenderDeviceId = process.env.XSENDER_DEVICE_ID || process.env.XSENDER_SENDER_ID;

      if (!xsenderUrl || !xsenderKey || xsenderKey === 'your_xsender_api_key_here' || xsenderKey.trim() === '') {
        status = 'skipped_config_error';
        errorMessage = 'XSENDER_API_KEY belum dikonfigurasi';
        // We throw so it goes to catch block or we just bypass fetch?
        // Better to not throw so we don't go to 'failed' status, but just break out
      } else {
        const payload: any = {
          to: phone,
          message: params.message
        };

        if (xsenderDeviceId) {
          payload.device_id = xsenderDeviceId;
          payload.sender_id = xsenderDeviceId;
        }

        const response = await fetch(xsenderUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${xsenderKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);
        providerResponse = data;

        if (!response.ok) {
          throw new Error(data?.message || `HTTP error! status: ${response.status}`);
        }

        status = 'sent';
      }
    } catch (error: any) {
      if (status !== 'skipped_config_error') {
        status = 'failed';
      }
      errorMessage = error.message;
    }
  }

  // Insert log ke database
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Dapatkan nama penerima jika user id tersedia (opsional)
    let recipientName = null;
    if (params.recipientUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', params.recipientUserId)
        .single();
      recipientName = profile?.full_name;
    }

    await supabase.from('whatsapp_notifications').insert({
      recipient_user_id: params.recipientUserId || null,
      recipient_phone: phone,
      recipient_name: recipientName,
      event_type: params.eventType,
      message: params.message,
      status: status,
      provider: 'xsender',
      provider_response: providerResponse,
      error_message: errorMessage,
      related_transaction_id: params.relatedTransactionId || null,
      created_by: user?.id || null,
      sent_at: status === 'sent' ? new Date().toISOString() : null
    });
  } catch (dbError) {
    console.error('Failed to save whatsapp log', dbError);
  }
}
