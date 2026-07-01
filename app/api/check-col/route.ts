import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminClient.from('whatsapp_settings').select('send_welcome_on_registration').limit(1);
    
    return NextResponse.json({ success: true, exists: !error, error });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
