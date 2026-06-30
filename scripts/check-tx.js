const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkTx() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: txs } = await supabase.from('transactions').select('*');
  console.log(txs.map(t => ({ id: t.id, proof: t.proof_url })));
}
checkTx();
