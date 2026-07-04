const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Update all profiles to be anonymous by default
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_anonymous: true })
    .is('is_anonymous', false); // Only update those that are currently false

  if (error) {
    console.error('Error updating profiles:', error);
  } else {
    console.log('Successfully updated profiles to be anonymous by default.');
  }
}

run();
