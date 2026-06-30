const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testAdminQuery() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: '628111111111@qurban.makt.id',
    password: 'Password123'
  });

  const { data: pendingTxs, error } = await supabase
    .from('transactions')
    .select('*, profiles!transactions_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  console.log('Pending tx count:', pendingTxs?.length);
  if (pendingTxs?.length > 0) {
    console.log('Sample:', pendingTxs[0]);
  }
}

testAdminQuery();
