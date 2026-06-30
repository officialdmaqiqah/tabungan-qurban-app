const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testUpdateSettings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: '628111111111@qurban.makt.id',
    password: 'Password123'
  });

  const { data: settings } = await supabase.from('program_settings').select('*').single();
  console.log('Current settings:', settings);

  const { data, error } = await supabase
    .from('program_settings')
    .update({ qurban_date: '2027-07-01' })
    .eq('id', settings.id);

  console.log('Update result:', data, 'Error:', error);
}

testUpdateSettings();
