import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { 
  notifyAdminOnDepositReported,
  notifyJamaahOnDepositApproved,
  notifyJamaahOnDepositRejected,
  sendManualReminderWA
} from '@/app/actions/transaction_whatsapp';
import { sendWhatsAppMessage } from '@/app/actions/whatsapp';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const logs: string[] = [];
    const pushLog = (msg: string) => logs.push(msg);

    // 1. Setup Test Users
    pushLog('--- Setup Test Users ---');
    
    // Create Auth users first
    const { data: user1, error: authErr1 } = await adminClient.auth.admin.createUser({
      email: `optin-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true
    });
    if (authErr1) throw authErr1;
    const userOptInId = user1.user.id;

    const { data: user2, error: authErr2 } = await adminClient.auth.admin.createUser({
      email: `nooptin-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true
    });
    if (authErr2) throw authErr2;
    const userNoOptInId = user2.user.id;

    await adminClient.from('profiles').upsert([
      { id: userOptInId, full_name: 'Test Opt In', phone: '081234567890', phone_normalized: '6281234567890', wa_opt_in: true, role: 'jamaah' },
      { id: userNoOptInId, full_name: 'Test No Opt In', phone: '081234567891', phone_normalized: '6281234567891', wa_opt_in: false, role: 'jamaah' }
    ]);
    pushLog('Created 2 test users (Opt-in and No Opt-in)');

    // 2. Setup Settings
    await adminClient.from('whatsapp_settings').update({
      admin_notification_phone: '628999999999',
      send_to_admin_on_deposit_reported: true,
      send_to_jamaah_on_deposit_approved: true,
      send_to_jamaah_on_deposit_rejected: true,
      is_enabled: true,
      dry_run: true
    }).eq('id', 1); // Assuming ID 1 exists

    // 3. Test Admin Message
    pushLog('--- Test Admin Message ---');
    await sendWhatsAppMessage({
      to: '628999999999',
      message: 'Test message from API',
      eventType: 'test_message'
    });
    
    // Verify
    const { data: adminMsgLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('event_type', 'test_message').order('created_at', { ascending: false }).limit(1);
    pushLog(`Admin message test: Status = ${adminMsgLogs?.[0]?.status}`);

    // 4. Test Deposit Reported
    pushLog('--- Test Deposit Reported ---');
    const { data: tx1, error: err1 } = await adminClient.from('transactions').insert({
      user_id: userOptInId,
      amount: 100000,
      method: 'transfer',
      status: 'pending'
    }).select('id').single();
    if (err1) throw err1;
    
    await notifyAdminOnDepositReported(tx1!.id);
    const { data: repLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('related_transaction_id', tx1!.id).eq('event_type', 'deposit_reported_admin');
    pushLog(`Deposit reported to admin: Count = ${repLogs?.length}, Status = ${repLogs?.[0]?.status}`);

    // 5. Test Deposit Approved (Opt-in)
    pushLog('--- Test Deposit Approved (Opt-in) ---');
    await adminClient.from('transactions').update({ status: 'verified' }).eq('id', tx1!.id);
    await notifyJamaahOnDepositApproved(tx1!.id);
    const { data: appLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('related_transaction_id', tx1!.id).eq('event_type', 'deposit_approved_jamaah');
    pushLog(`Deposit approved: Status = ${appLogs?.[0]?.status}`);

    // 6. Test Deposit Rejected (Opt-in)
    pushLog('--- Test Deposit Rejected (Opt-in) ---');
    const { data: tx2, error: err2 } = await adminClient.from('transactions').insert({
      user_id: userOptInId,
      amount: 50000,
      method: 'transfer',
      status: 'rejected'
    }).select('id').single();
    if (err2) throw err2;
    await notifyJamaahOnDepositRejected(tx2!.id, 'Bukti buram');
    const { data: rejLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('related_transaction_id', tx2!.id).eq('event_type', 'deposit_rejected_jamaah');
    pushLog(`Deposit rejected: Status = ${rejLogs?.[0]?.status}, Error = ${rejLogs?.[0]?.error_message}`);

    // 7. Test No Opt-in
    pushLog('--- Test No Opt-in ---');
    const { data: tx3, error: err3 } = await adminClient.from('transactions').insert({
      user_id: userNoOptInId,
      amount: 200000,
      method: 'tunai',
      status: 'verified'
    }).select('id').single();
    if (err3) throw err3;
    await notifyJamaahOnDepositApproved(tx3!.id);
    const { data: noOptLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('related_transaction_id', tx3!.id).eq('event_type', 'deposit_approved_jamaah');
    pushLog(`Deposit approved (no opt in): Status = ${noOptLogs?.[0]?.status}, Reason = ${noOptLogs?.[0]?.error_message}`);

    // 8. Test Manual Reminder
    pushLog('--- Test Manual Reminder ---');
    await sendManualReminderWA(userOptInId);
    const { data: remLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('recipient_user_id', userOptInId).eq('event_type', 'manual_reminder').order('created_at', { ascending: false });
    pushLog(`Manual reminder: Status = ${remLogs?.[0]?.status}`);

    // 9. Test Registration Welcome (Opt-in)
    pushLog('--- Test Registration Welcome (Opt-in) ---');
    const { sendRegistrationWelcomeWA } = await import('@/app/actions/transaction_whatsapp');
    await sendRegistrationWelcomeWA(userOptInId, '6281234567890', true);
    const { data: regOptLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('recipient_user_id', userOptInId).eq('event_type', 'registration_welcome_jamaah').order('created_at', { ascending: false });
    pushLog(`Registration welcome (opt-in): Status = ${regOptLogs?.[0]?.status}, Message length = ${regOptLogs?.[0]?.message?.length}`);

    // 10. Test Registration Welcome (No Opt-in)
    pushLog('--- Test Registration Welcome (No Opt-in) ---');
    await sendRegistrationWelcomeWA(userNoOptInId, '6281234567891', false);
    const { data: regNoOptLogs } = await adminClient.from('whatsapp_notifications').select('*').eq('recipient_user_id', userNoOptInId).eq('event_type', 'registration_welcome_jamaah').order('created_at', { ascending: false });
    pushLog(`Registration welcome (no opt-in): Status = ${regNoOptLogs?.[0]?.status}, Reason = ${regNoOptLogs?.[0]?.error_message}`);

    // Cleanup
    pushLog('--- Cleanup ---');
    await adminClient.from('whatsapp_notifications').delete().in('recipient_user_id', [userOptInId, userNoOptInId]);
    await adminClient.from('transactions').delete().in('user_id', [userOptInId, userNoOptInId]);
    await adminClient.from('profiles').delete().in('id', [userOptInId, userNoOptInId]);
    await adminClient.auth.admin.deleteUser(userOptInId);
    await adminClient.auth.admin.deleteUser(userNoOptInId);
    pushLog('Done cleanup');

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
