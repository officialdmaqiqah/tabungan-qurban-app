const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('profiles').select('full_name, phone_normalized, wa_opt_in, id').like('phone_normalized', '%6285335150001%');
  console.log('Profile:', data);
  
  if (data && data.length > 0) {
    const { data: logs } = await supabase.from('whatsapp_notifications').select('*').eq('recipient_user_id', data[0].id);
    console.log('Logs:', logs);
  }
}

check();
