'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface WhatsAppParams {
  to: string;
  message: string;
  eventType: string;
  recipientUserId?: string;
  relatedTransactionId?: string;
}

export async function sendWhatsAppMessage(params: WhatsAppParams) {
  const supabaseAuth = await createClient();
  const supabase = createAdminClient();

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
      // Hardcode the correct endpoint from the docs, or fallback to env
      const xsenderUrl = 'https://xsender.id/send-message';
      const xsenderKey = process.env.XSENDER_API_KEY;
      const xsenderSender = process.env.XSENDER_DEVICE_ID || process.env.XSENDER_SENDER_ID;

      if (!xsenderKey || xsenderKey === 'your_xsender_api_key_here' || xsenderKey.trim() === '') {
        status = 'skipped_config_error';
        errorMessage = 'XSENDER_API_KEY belum dikonfigurasi';
      } else if (!xsenderSender || xsenderSender.trim() === '') {
        status = 'skipped_config_error';
        errorMessage = 'XSENDER_DEVICE_ID belum dikonfigurasi (harus diisi dengan nomor device/pengirim)';
      } else {
        const payload: any = {
          api_key: xsenderKey,
          sender: xsenderSender,
          number: phone,
          message: params.message
        };

        const response = await fetch(xsenderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        let data;
        try {
          data = await response.json();
        } catch (e) {
          data = { message: await response.text() };
        }
        
        providerResponse = data;

        if (!response.ok || data?.status === false) {
          throw new Error(data?.message || data?.msg || `API Error! status: ${response.status}`);
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
    const { data: { user } } = await supabaseAuth.auth.getUser().catch(() => ({ data: { user: null } }));

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
