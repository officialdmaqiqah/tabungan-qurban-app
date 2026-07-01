const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    const txId = 'cf42cc89-2823-48b9-8ccc-c6b3fefe09e4';
    console.log('Querying tx:', txId);
    
    const { data: tx, error } = await supabase
      .from('transactions')
      .select('*, profiles!transactions_user_id_fkey(full_name)')
      .eq('id', txId)
      .single();

    console.log('TX Data:', tx);
    console.log('TX Error:', error);
    
    if (!tx) {
        console.log('No tx, returning');
        return;
    }

    const { data: settings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('send_to_admin_on_deposit_reported, admin_notification_phone')
      .single();

    console.log('Settings Data:', settings);
    console.log('Settings Error:', settingsError);
    
    if (!settings?.send_to_admin_on_deposit_reported || !settings?.admin_notification_phone) {
        console.log('Settings missing, returning');
        return;
    }

    console.log('Would send message to:', settings.admin_notification_phone);
  } catch (err) {
    console.log('Caught exception:', err);
  }
}

check();
