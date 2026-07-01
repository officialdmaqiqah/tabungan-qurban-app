require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
  const { data, error } = await supabase.rpc('check_rls', {});
  if (error) {
    console.log("No rpc 'check_rls'. Trying raw query via rest is not allowed for pg_tables unless exposed. Checking table inserts with anon key...");
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { error: e1 } = await anon.from('profiles').insert([{id: '00000000-0000-0000-0000-000000000000', full_name: 'test'}]);
    console.log("Profiles anon insert error (should be true if RLS blocks):", !!e1, e1?.message);
    const { error: e2 } = await anon.from('transactions').select('*').limit(1);
    console.log("Transactions anon select error (should be true if RLS blocks):", !!e2, e2?.message);
  }
}

checkRLS();
