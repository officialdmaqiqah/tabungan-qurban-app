require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function makeBucketsPrivate() {
  const buckets = ['proofs', 'transfer_proofs'];
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.updateBucket(bucket, {
      public: false
    });
    console.log(`Update bucket ${bucket} result:`, data, error);
  }
}

makeBucketsPrivate();
