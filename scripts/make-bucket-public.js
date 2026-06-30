const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function makeBucketPublic() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.storage.updateBucket('proofs', {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    fileSizeLimit: 2097152 // 2MB
  });

  console.log('Update bucket result:', data, error);
}

makeBucketPublic();
