const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Verification logic identical to app/actions/transaction.ts
async function atomicApprove(txId, adminId, txAmount, txName) {
  const nowIso = new Date().toISOString();
  
  // 1. Atomic update conditional on status = 'pending'
  const { data: updatedTxs, error: updateError } = await supabase
    .from('transactions')
    .update({
      status: 'verified',
      verified_at: nowIso,
      verified_by: adminId,
    })
    .eq('id', txId)
    .eq('status', 'pending')
    .select('id, amount, user_id, status');

  if (updateError) {
    return { success: false, error: updateError.message, code: 'DB_ERROR' };
  }

  if (!updatedTxs || updatedTxs.length === 0) {
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('id', txId)
      .single();

    if (!existingTx) return { success: false, error: 'Not found', code: 'NOT_FOUND' };
    if (existingTx.status === 'verified') return { success: false, error: 'Already verified', code: 'ALREADY_VERIFIED' };
    if (existingTx.status === 'rejected') return { success: false, error: 'Already rejected', code: 'ALREADY_REJECTED' };
    return { success: false, error: 'Invalid status', code: 'INVALID_STATUS' };
  }

  // 2. Only insert audit log if update succeeded
  const { data: log, error: logErr } = await supabase.from('audit_logs').insert({
    admin_id: adminId,
    action: 'verifikasi setoran',
    target_id: txId,
    details: `[TEST] Memverifikasi setoran Rp ${txAmount} atas nama ${txName}`,
    created_at: nowIso,
  }).select();

  return { success: true, logId: log?.[0]?.id };
}

async function runRegressionTests() {
  console.log('=== STARTING REGRESSION TESTS ===');

  // Test user: Robi Rendra Tribuana
  const userId = 'a9a58419-0831-4d08-8a84-31169ee0a9cf';
  const adminAgustian = 'a96ead09-8de4-4070-b576-8130b37dd052';
  const adminYahya = '3c99955e-a0b7-4141-bfda-55a608edaf95';

  const createdTxIds = [];
  const createdLogIds = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: Single Approve
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Single Approve ---');
    const { data: tx1, error: tx1Err } = await supabase.from('transactions').insert({
      user_id: userId,
      amount: 10000,
      method: 'transfer',
      status: 'pending'
    }).select().single();
    if (tx1Err) throw tx1Err;
    createdTxIds.push(tx1.id);

    const res1 = await atomicApprove(tx1.id, adminAgustian, '10.000', 'Test User 1');
    if (res1.logId) createdLogIds.push(res1.logId);
    console.log('Result 1:', res1);

    const { data: check1 } = await supabase.from('transactions').select('status, verified_at').eq('id', tx1.id).single();
    console.log('TX 1 Status:', check1.status);
    if (res1.success !== true || check1.status !== 'verified') {
      throw new Error('Test 1 failed');
    }
    console.log('✅ TEST 1 PASSED: Single approve succeeded and status updated to verified');

    // -------------------------------------------------------------
    // TEST 2: Double Click Approve (Simultaneous rapid requests)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Double Click Approve (Rapid Double Submission) ---');
    const { data: tx2, error: tx2Err } = await supabase.from('transactions').insert({
      user_id: userId,
      amount: 20000,
      method: 'transfer',
      status: 'pending'
    }).select().single();
    if (tx2Err) throw tx2Err;
    createdTxIds.push(tx2.id);

    // Send 2 requests at the exact same instant
    const [clickA, clickB] = await Promise.all([
      atomicApprove(tx2.id, adminAgustian, '20.000', 'Test User 2'),
      atomicApprove(tx2.id, adminAgustian, '20.000', 'Test User 2')
    ]);
    if (clickA.logId) createdLogIds.push(clickA.logId);
    if (clickB.logId) createdLogIds.push(clickB.logId);
    console.log('Click A result:', clickA);
    console.log('Click B result:', clickB);

    const { data: logsTx2 } = await supabase.from('audit_logs').select('*').eq('target_id', tx2.id);
    console.log('Audit logs created for TX 2 count:', logsTx2.length);
    const oneSucceeded = (clickA.success && !clickB.success) || (!clickA.success && clickB.success);
    if (!oneSucceeded || logsTx2.length !== 1) {
      throw new Error('Test 2 failed: exactly one should succeed and one audit log created');
    }
    console.log('✅ TEST 2 PASSED: Double click handled safely; exactly 1 succeeded, 0 duplicate logs');

    // -------------------------------------------------------------
    // TEST 3: Approve Ulang Transaksi yang Sudah Approved
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Re-approve Already Approved Transaction ---');
    const res3 = await atomicApprove(tx1.id, adminAgustian, '10.000', 'Test User 1');
    console.log('Result 3:', res3);
    const { data: logsTx1 } = await supabase.from('audit_logs').select('*').eq('target_id', tx1.id);
    console.log('Audit logs for TX 1 count (should still be 1):', logsTx1.length);
    if (res3.success !== false || res3.code !== 'ALREADY_VERIFIED' || logsTx1.length !== 1) {
      throw new Error('Test 3 failed: should be rejected without duplicate audit log');
    }
    console.log('✅ TEST 3 PASSED: Re-approve rejected cleanly without creating audit log');

    // -------------------------------------------------------------
    // TEST 4: Dua Admin Approve Transaksi Sama Hampir Bersamaan
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Two Different Admins Approving Same Transaction Simultaneously ---');
    const { data: tx4, error: tx4Err } = await supabase.from('transactions').insert({
      user_id: userId,
      amount: 40000,
      method: 'transfer',
      status: 'pending'
    }).select().single();
    if (tx4Err) throw tx4Err;
    createdTxIds.push(tx4.id);

    // Admin Agustian and Admin Yahya click approve at the exact same millisecond
    const [admin1Res, admin2Res] = await Promise.all([
      atomicApprove(tx4.id, adminAgustian, '40.000', 'Test User 4'),
      atomicApprove(tx4.id, adminYahya, '40.000', 'Test User 4')
    ]);
    if (admin1Res.logId) createdLogIds.push(admin1Res.logId);
    if (admin2Res.logId) createdLogIds.push(admin2Res.logId);
    console.log('Admin 1 (Agustian) result:', admin1Res);
    console.log('Admin 2 (Yahya) result:', admin2Res);

    const { data: logsTx4 } = await supabase.from('audit_logs').select('*').eq('target_id', tx4.id);
    console.log('Audit logs created for TX 4 count:', logsTx4.length);
    const concurrentOneSucceeded = (admin1Res.success && !admin2Res.success) || (!admin1Res.success && admin2Res.success);
    if (!concurrentOneSucceeded || logsTx4.length !== 1) {
      throw new Error('Test 4 failed: exactly one admin must succeed');
    }
    console.log('✅ TEST 4 PASSED: Race condition resolved by atomic lock; exactly 1 admin won, 1 audit log');

    console.log('\n========================================');
    console.log('🎉 ALL 4 REGRESSION TESTS PASSED 100%!');
    console.log('========================================');
  } finally {
    // Clean up test transactions and test audit logs
    console.log('\n--- CLEANUP TEST DATA ---');
    if (createdLogIds.length > 0) {
      await supabase.from('audit_logs').delete().in('id', createdLogIds);
    }
    if (createdTxIds.length > 0) {
      await supabase.from('transactions').delete().in('id', createdTxIds);
    }
    console.log('Cleanup completed cleanly.');
  }
}

runRegressionTests();
