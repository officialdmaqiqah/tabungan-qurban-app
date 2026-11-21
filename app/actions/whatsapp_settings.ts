'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { formatWhatsAppNumber } from '@/lib/utils';

export async function updateWhatsAppSettings(data: any) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      throw new Error('Unauthorized');
    }

    // Fetch the actual UUID first to avoid type errors
    const { data: currentSettings } = await supabase
      .from('whatsapp_settings')
      .select('id')
      .single();

    if (!currentSettings) {
      throw new Error('Pengaturan belum diinisialisasi di database.');
    }

    // Validasi masukan dari browser
    if (!data || typeof data !== 'object') throw new Error('Data pengaturan tidak valid.');
    const boolFields = [
      'is_enabled', 'dry_run', 'send_to_admin_on_deposit_reported', 'send_to_jamaah_on_deposit_approved',
      'send_to_jamaah_on_deposit_rejected', 'send_manual_reminder_enabled', 'send_welcome_on_registration',
    ];
    for (const f of boolFields) {
      if (data[f] !== undefined && typeof data[f] !== 'boolean') throw new Error('Data pengaturan tidak valid.');
    }
    if (data.admin_notification_phone) {
      const { formatted, error: phoneError } = formatWhatsAppNumber(String(data.admin_notification_phone));
      if (phoneError || !formatted) throw new Error(phoneError || 'Nomor WA admin tidak valid.');
      data.admin_notification_phone = formatted;
    } else {
      data.admin_notification_phone = null;
    }
    const { data: before } = await supabase
      .from('whatsapp_settings')
      .select('is_enabled, dry_run, admin_notification_phone')
      .eq('id', currentSettings.id)
      .single();

    // Attempt to update
    const { error } = await supabase
      .from('whatsapp_settings')
      .update({
        is_enabled: data.is_enabled,
        dry_run: data.dry_run,
        admin_notification_phone: data.admin_notification_phone,
        send_to_admin_on_deposit_reported: data.send_to_admin_on_deposit_reported,
        send_to_jamaah_on_deposit_approved: data.send_to_jamaah_on_deposit_approved,
        send_to_jamaah_on_deposit_rejected: data.send_to_jamaah_on_deposit_rejected,
        send_manual_reminder_enabled: data.send_manual_reminder_enabled,
        send_welcome_on_registration: data.send_welcome_on_registration,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSettings.id);

    // If there's an error because send_welcome_on_registration doesn't exist, try falling back
    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message.includes('schema cache'))) {
      const { error: fallbackError } = await supabase
        .from('whatsapp_settings')
        .update({
          is_enabled: data.is_enabled,
          dry_run: data.dry_run,
          admin_notification_phone: data.admin_notification_phone,
          send_to_admin_on_deposit_reported: data.send_to_admin_on_deposit_reported,
          send_to_jamaah_on_deposit_approved: data.send_to_jamaah_on_deposit_approved,
          send_to_jamaah_on_deposit_rejected: data.send_to_jamaah_on_deposit_rejected,
          send_manual_reminder_enabled: data.send_manual_reminder_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSettings.id);

      if (fallbackError) throw fallbackError;
    } else if (error) {
      throw error;
    }

    await createAdminClient().from('audit_logs').insert({
      admin_id: user.id,
      action: 'ubah pengaturan WA',
      target_id: null,
      details: `Pengaturan WhatsApp diubah. Aktif: ${before?.is_enabled} -> ${data.is_enabled}; Dry run: ${before?.dry_run} -> ${data.dry_run}; No. WA admin: ${before?.admin_notification_phone || '-'} -> ${data.admin_notification_phone || '-'}`,
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/whatsapp');
    revalidatePath('/admin/audit-log');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
