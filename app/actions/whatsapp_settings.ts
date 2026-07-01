'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

    if (profile?.role !== 'admin') {
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

    revalidatePath('/admin/whatsapp');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
