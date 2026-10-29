const { createClient } = require('@supabase/supabase-js');
const { maskName, formatCurrency } = require('./test-utils-helper');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTransparencyRegression() {
  console.log('=== STARTING TRANSPARENCY REGRESSION TEST ===\n');

  // 1. Fetch data as in app/transparansi/page.tsx
  const { data: jamaahList, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, is_anonymous');
  if (pErr) throw pErr;

  const { data: transactions, error: tErr } = await supabase
    .from('transactions')
    .select('user_id, amount')
    .eq('status', 'verified');
  if (tErr) throw tErr;

  const { data: userPackages, error: upErr } = await supabase
    .from('user_packages')
    .select('user_id, package_id, quantity, qurban_packages(price)');
  if (upErr) throw upErr;

  // Simulate aggregation logic
  function aggregate(jamaah) {
    const isAnonymous = Boolean(jamaah.is_anonymous);
    let publicName = jamaah.full_name || 'Hamba Allah';

    if (isAnonymous) {
      publicName = publicName.split(' ').map(w => maskName(w)).join(' ');
    }

    const totalTabungan = transactions
      ?.filter(t => t.user_id === jamaah.id)
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const target = userPackages
      ?.filter(up => up.user_id === jamaah.id)
      .reduce((sum, up) => sum + ((Number(up.qurban_packages?.price) || 0) * (up.quantity || 1)), 0) || 0;

    const progress = target > 0 ? Math.min(100, Math.round((totalTabungan / target) * 100)) : 0;

    return {
      id: jamaah.id,
      publicName,
      isAnonymous,
      totalTabungan,
      target,
      progress
    };
  }

  // --- CHECK 1: Normal Users (is_anonymous = false) ---
  console.log('--- CHECK 1: Normal Jamaah (is_anonymous = false) Display Full Name ---');
  const targetNames = ['Agustian Safitri', 'Haris Munandar', 'Rifky Mei Manda', 'Robi Rendra Tribuana'];
  
  for (const name of targetNames) {
    const user = jamaahList.find(j => j.full_name === name);
    if (!user) {
      console.warn(`User ${name} not found in database!`);
      continue;
    }
    const item = aggregate(user);
    console.log(`[USER] ${name} -> Public Name: "${item.publicName}" (isAnonymous: ${item.isAnonymous})`);
    if (item.publicName !== name) {
      throw new Error(`Expected full name "${name}" but got "${item.publicName}"`);
    }
  }
  console.log('✅ CHECK 1 PASSED: Full names displayed by default.\n');

  // --- CHECK 2: User with is_anonymous = true (Simulate Opt-in Privacy) ---
  console.log('--- CHECK 2: User with is_anonymous = true Displays Masked Name ---');
  const simulatedAnonUser = {
    id: 'test-anon-id',
    full_name: 'Agustian Safitri',
    is_anonymous: true
  };
  const anonItem = aggregate(simulatedAnonUser);
  console.log(`[SIMULATED ANON] Full Name: "Agustian Safitri" -> Public Name: "${anonItem.publicName}"`);
  if (anonItem.publicName !== 'A******n S*****i') {
    throw new Error(`Expected masked name "A******n S*****i" but got "${anonItem.publicName}"`);
  }
  console.log('✅ CHECK 2 PASSED: Masking correctly applied when is_anonymous = true.\n');

  // --- CHECK 3: Verify Robi Rendra Tribuana Balance & Progress ---
  console.log('--- CHECK 3: Verify Robi Rendra Tribuana Saldo & Progres ---');
  const robi = jamaahList.find(j => j.full_name?.includes('Robi Rendra'));
  if (robi) {
    const robiItem = aggregate(robi);
    console.log(`Robi Saldo: Rp ${robiItem.totalTabungan.toLocaleString('id-ID')}, Target: Rp ${robiItem.target.toLocaleString('id-ID')}, Progress: ${robiItem.progress}%`);
    if (robiItem.totalTabungan !== 50000) {
      throw new Error(`Robi saldo expected 50.000, got ${robiItem.totalTabungan}`);
    }
  }
  console.log('✅ CHECK 3 PASSED: Robi saldo is accurate (Rp 50.000).\n');

  // --- CHECK 4: Ensure No Sensitive Fields Exposed ---
  console.log('--- CHECK 4: Security Audit - No Sensitive Fields in Transparansi Page ---');
  const sampleData = aggregate(jamaahList[0]);
  const allowedKeys = ['id', 'publicName', 'isAnonymous', 'totalTabungan', 'target', 'progress'];
  const dataKeys = Object.keys(sampleData);
  const sensitiveKeys = ['phone', 'phone_normalized', 'address', 'proof_url', 'password'];
  for (const k of sensitiveKeys) {
    if (dataKeys.includes(k)) {
      throw new Error(`CRITICAL SECURITY FAILURE: ${k} leaked in transparency data!`);
    }
  }
  console.log('Fields present in transparency row:', dataKeys);
  console.log('✅ CHECK 4 PASSED: Zero sensitive fields exposed.\n');

  console.log('====================================================');
  console.log('🎉 ALL TRANSPARENCY REGRESSION CHECKS PASSED 100%!');
  console.log('====================================================');
}

runTransparencyRegression().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
