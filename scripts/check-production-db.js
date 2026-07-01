require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('--- PACKAGES ---');
  const { data: pkgs, error: pkgsErr } = await supabase.from('qurban_packages').select('*');
  console.log(pkgsErr ? pkgsErr : pkgs);

  console.log('\n--- PROFILES (First 5) ---');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').limit(5);
  console.log(profErr ? profErr : profiles);

  console.log('\n--- TRANSACTIONS (First 5) ---');
  const { data: tx, error: txErr } = await supabase.from('transactions').select('*').limit(5);
  console.log(txErr ? txErr : tx);
}

check();
