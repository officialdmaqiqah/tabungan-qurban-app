'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { isAdminOrSuperAdmin } from '@/lib/roles';
import { notifyJamaahOnDepositApproved, notifyJamaahOnDepositRejected } from '@/app/actions/transaction_whatsapp';

interface TransactionActionResult {
  success: boolean;
  error?: string;
  code?: string;
}

export async function approveTransactionAction(
  input: FormData | { txId: string; txAmount?: string; txName?: string }
): Promise<TransactionActionResult> {
  try {
    let txId = '';
    let txAmount = '';
    let txName = '';

    if (input instanceof FormData) {
      txId = (input.get('txId') as string) || '';
      txAmount = (input.get('txAmount') as string) || '';
      txName = (input.get('txName') as string) || '';
    } else {
      txId = input.txId;
      txAmount = input.txAmount || '';
      txName = input.txName || '';
    }

    if (!txId) {
      return { success: false, error: 'ID transaksi tidak valid.', code: 'INVALID_ID' };
    }

    // 1. Verify caller authentication & role (Admin or Super Admin)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Anda harus login terlebih dahulu.', code: 'UNAUTHORIZED' };
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, phone')
      .eq('id', user.id)
      .single();

    const allowed = isAdminOrSuperAdmin(
      callerProfile?.role,
      user.user_metadata?.role,
      callerProfile?.phone || user.phone
    );

    if (!allowed) {
      return {
        success: false,
        error: 'Akses ditolak: Hanya Admin/Bendahara atau Super Admin yang berhak memverifikasi setoran.',
        code: 'FORBIDDEN',
      };
    }

    // 2. Atomic Server-Side Update with Idempotency Guard
    // Only update if status is currently 'pending'. PostgreSQL locks the row during update,
    // guaranteeing that concurrent or double-click requests can only succeed once.
    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: updatedTxs, error: updateError } = await adminClient
      .from('transactions')
      .update({
        status: 'verified',
        verified_at: nowIso,
        verified_by: user.id,
      })
      .eq('id', txId)
      .eq('status', 'pending')
      .select('id, amount, user_id, status, profiles!transactions_user_id_fkey(full_name)');

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return { success: false, error: updateError.message, code: 'DB_ERROR' };
    }

    // If no row was updated, the transaction was either not found or already verified/rejected
    if (!updatedTxs || updatedTxs.length === 0) {
      const { data: existingTx } = await adminClient
        .from('transactions')
        .select('id, status, amount, profiles!transactions_user_id_fkey(full_name)')
        .eq('id', txId)
        .single();

      if (!existingTx) {
        return { success: false, error: 'Transaksi tidak ditemukan.', code: 'NOT_FOUND' };
      }

      if (existingTx.status === 'verified') {
        return {
          success: false,
          error: 'Transaksi ini sudah diverifikasi sebelumnya.',
          code: 'ALREADY_VERIFIED',
        };
      }

      if (existingTx.status === 'rejected') {
        return {
          success: false,
          error: 'Transaksi ini sudah ditolak sebelumnya.',
          code: 'ALREADY_REJECTED',
        };
      }

      return {
        success: false,
        error: `Transaksi tidak dapat diverifikasi (status saat ini: ${existingTx.status}).`,
        code: 'INVALID_STATUS',
      };
    }

    // 3. Status successfully transitioned from 'pending' to 'verified'.
    // ONLY insert audit log and send WhatsApp when the transition actually happened.
    const updatedTx = updatedTxs[0];
    const resolvedName = txName || (updatedTx.profiles as any)?.full_name || 'Jamaah';
    const resolvedAmount = txAmount || Number(updatedTx.amount).toLocaleString('id-ID');

    await adminClient.from('audit_logs').insert({
      admin_id: user.id,
      action: 'verifikasi setoran',
      target_id: txId,
      details: `Memverifikasi setoran Rp ${resolvedAmount} atas nama ${resolvedName}`,
      created_at: nowIso,
    });

    // 4. Trigger WhatsApp notification asynchronously
    notifyJamaahOnDepositApproved(txId).catch((err) => {
      console.error('Failed to notify jamaah on deposit approved:', err);
    });

    // 5. Revalidate relevant paths
    revalidatePath('/admin/verifikasi');
    revalidatePath('/admin/jamaah');
    revalidatePath('/dashboard');
    revalidatePath('/admin/audit-log');

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in approveTransactionAction:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat memverifikasi setoran.',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

export async function rejectTransactionAction(
  input: FormData | { txId: string; adminNote?: string; txAmount?: string; txName?: string }
): Promise<TransactionActionResult> {
  try {
    let txId = '';
    let adminNote = '';
    let txAmount = '';
    let txName = '';

    if (input instanceof FormData) {
      txId = (input.get('txId') as string) || '';
      adminNote = (input.get('adminNote') as string) || '';
      txAmount = (input.get('txAmount') as string) || '';
      txName = (input.get('txName') as string) || '';
    } else {
      txId = input.txId;
      adminNote = input.adminNote || '';
      txAmount = input.txAmount || '';
      txName = input.txName || '';
    }

    if (!txId) {
      return { success: false, error: 'ID transaksi tidak valid.', code: 'INVALID_ID' };
    }

    // 1. Verify caller authentication & role
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Anda harus login terlebih dahulu.', code: 'UNAUTHORIZED' };
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, phone')
      .eq('id', user.id)
      .single();

    const allowed = isAdminOrSuperAdmin(
      callerProfile?.role,
      user.user_metadata?.role,
      callerProfile?.phone || user.phone
    );

    if (!allowed) {
      return {
        success: false,
        error: 'Akses ditolak: Hanya Admin/Bendahara atau Super Admin yang berhak menolak setoran.',
        code: 'FORBIDDEN',
      };
    }

    // 2. Atomic Server-Side Update with Idempotency Guard
    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: updatedTxs, error: updateError } = await adminClient
      .from('transactions')
      .update({
        status: 'rejected',
        verified_at: nowIso,
        verified_by: user.id,
        admin_note: adminNote || null,
      })
      .eq('id', txId)
      .eq('status', 'pending')
      .select('id, amount, user_id, status, profiles!transactions_user_id_fkey(full_name)');

    if (updateError) {
      console.error('Error rejecting transaction:', updateError);
      return { success: false, error: updateError.message, code: 'DB_ERROR' };
    }

    if (!updatedTxs || updatedTxs.length === 0) {
      const { data: existingTx } = await adminClient
        .from('transactions')
        .select('id, status, amount, profiles!transactions_user_id_fkey(full_name)')
        .eq('id', txId)
        .single();

      if (!existingTx) {
        return { success: false, error: 'Transaksi tidak ditemukan.', code: 'NOT_FOUND' };
      }

      if (existingTx.status === 'verified') {
        return {
          success: false,
          error: 'Transaksi ini sudah diverifikasi sebelumnya.',
          code: 'ALREADY_VERIFIED',
        };
      }

      if (existingTx.status === 'rejected') {
        return {
          success: false,
          error: 'Transaksi ini sudah ditolak sebelumnya.',
          code: 'ALREADY_REJECTED',
        };
      }

      return {
        success: false,
        error: `Transaksi tidak dapat ditolak (status saat ini: ${existingTx.status}).`,
        code: 'INVALID_STATUS',
      };
    }

    // 3. Status successfully transitioned from 'pending' to 'rejected'.
    const updatedTx = updatedTxs[0];
    const resolvedName = txName || (updatedTx.profiles as any)?.full_name || 'Jamaah';
    const resolvedAmount = txAmount || Number(updatedTx.amount).toLocaleString('id-ID');

    await adminClient.from('audit_logs').insert({
      admin_id: user.id,
      action: 'tolak setoran',
      target_id: txId,
      details: `Menolak setoran Rp ${resolvedAmount} atas nama ${resolvedName}${adminNote ? ` (Alasan: ${adminNote})` : ''}`,
      created_at: nowIso,
    });

    // 4. Trigger WhatsApp notification
    notifyJamaahOnDepositRejected(txId, adminNote).catch((err) => {
      console.error('Failed to notify jamaah on deposit rejected:', err);
    });

    // 5. Revalidate relevant paths
    revalidatePath('/admin/verifikasi');
    revalidatePath('/admin/jamaah');
    revalidatePath('/dashboard');
    revalidatePath('/admin/audit-log');

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in rejectTransactionAction:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat menolak setoran.',
      code: 'UNEXPECTED_ERROR',
    };
  }
}
