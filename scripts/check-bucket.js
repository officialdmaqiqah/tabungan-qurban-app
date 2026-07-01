require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBucket() {
  const { data, error } = await supabase.storage.getBucket('proofs');
  console.log('Bucket details:', data, error);
}

checkBucket();
