const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles);

  const { data: txs } = await supabase.from('transactions').select('*');
  console.log('Transactions:', txs.length);

  const { data: userPkgs } = await supabase.from('user_packages').select('*');
  console.log('User Packages:', userPkgs.length);
}
check();
