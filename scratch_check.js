const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('user_packages').select('*, packages(price)').eq('user_id', 'bb25671b-8083-4ebb-8474-715ed1a89d45');
  console.log('user_packages:', JSON.stringify(data, null, 2));
}

check();
