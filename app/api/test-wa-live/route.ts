import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/app/actions/whatsapp';

export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Setup Settings
    const { data: currentSettings } = await adminClient.from('whatsapp_settings').select('id').single();
    if (currentSettings) {
      await adminClient.from('whatsapp_settings').update({
        admin_notification_phone: '628999999999', // dummy admin phone
        send_to_admin_on_deposit_reported: true,
        send_to_jamaah_on_deposit_approved: false, // disabled for now as requested
        send_to_jamaah_on_deposit_rejected: false, // disabled for now as requested
        is_enabled: true,
        dry_run: false
      }).eq('id', currentSettings.id);
    }

    // 3. Test Admin Message
    await sendWhatsAppMessage({
      to: '628999999999',
      message: 'Test live message from API',
      eventType: 'test_message'
    });
    
    // Verify
    const { data: adminMsgLogs } = await adminClient.from('whatsapp_notifications')
      .select('*')
      .eq('event_type', 'test_message')
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({ success: true, log: adminMsgLogs?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
