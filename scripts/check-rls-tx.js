require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_policies', {});
  console.log("Policies via rpc (if exists):", error ? "No RPC" : data);
  
  // Can we query pg_tables?
  // We can't directly query postgres catalog from REST API unless exposed.
  console.log("Checking if we can insert into transactions anonymously...");
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: e3 } = await anon.from('transactions').insert([{amount: 1000, user_id: '3c99955e-a0b7-4141-bfda-55a608edaf95', status: 'pending'}]);
  console.log("Transactions anon insert error:", !!e3, e3?.message);
}

checkRLS();
