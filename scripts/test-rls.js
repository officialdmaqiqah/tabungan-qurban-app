const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuery() {
  // Login as Jamaah 0%
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: '628222222222@qurban.makt.id',
    password: 'Password123'
  });

  if (signInError) {
    console.error('Sign in error:', signInError);
    return;
  }

  console.log('Logged in as:', data.user.id);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  console.log('Profile data:', profile);
  console.log('Profile error:', error);
}

testQuery();
