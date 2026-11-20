'use server';

// Aksi admin untuk akun jamaah: persetujuan pendaftaran dan reset PIN.
// Setiap aksi memeriksa role admin/super_admin sendiri.

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/auth-guards';
import { clearLoginFailures, derivePinPassword, validatePin } from '@/lib/pin-auth';
import { notifyJamaahOnApprovalResult } from '@/lib/wa/notifications';

type Result = { success: true; message?: string } | { success: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function setApproval(userId: string, approved: boolean, note?: string): Promise<Result> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, error: 'Akses ditolak: hanya admin.' };
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) return { success: false, error: 'Data tidak valid.' };

  const cleanNote = typeof note === 'string' ? note.trim().slice(0, 300) : '';
  const adminClient = createAdminClient();

  const { data: target } = await adminClient
    .from('profiles')
    .select('id, full_name, phone_normalized, role, approval_status')
    .eq('id', userId)
    .single();
  if (!target) return { success: false, error: 'Data jamaah tidak ditemukan.' };
  if (target.role === 'admin' || target.role === 'super_admin') {
    return { success: false, error: 'Akun admin tidak memerlukan persetujuan.' };
  }

  const newStatus = approved ? 'approved' : 'rejected';
  if (target.approval_status === newStatus) {
    return { success: false, error: approved ? 'Akun sudah disetujui.' : 'Akun sudah ditolak.' };
  }

  const { error } = await adminClient
    .from('profiles')
    .update({
      approval_status: newStatus,
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      approval_note: cleanNote || null,
    })
    .eq('id', userId);
  if (error) {
    console.error('Approval update failed:', error);
    return { success: false, error: 'Gagal menyimpan. Pastikan migrasi database terbaru sudah dijalankan.' };
  }

  await adminClient.from('audit_logs').insert({
    admin_id: admin.id,
    action: approved ? 'setujui pendaftaran' : 'tolak pendaftaran',
    target_id: userId,
    details: `${approved ? 'Menyetujui' : 'Menolak'} pendaftaran ${target.full_name || '-'} (${target.phone_normalized || '-'})${cleanNote ? `. Catatan: ${cleanNote}` : ''}`,
    created_at: new Date().toISOString(),
  });

  await notifyJamaahOnApprovalResult(userId, approved, cleanNote || null);

  revalidatePath('/admin/jamaah');
  revalidatePath(`/admin/jamaah/${userId}`);
  revalidatePath('/admin/audit-log');
  return {
    success: true,
    message: approved ? `Pendaftaran ${target.full_name} disetujui.` : `Pendaftaran ${target.full_name} ditolak.`,
  };
}

export async function approveRegistration(userId: string): Promise<Result> {
  return setApproval(userId, true);
}

export async function rejectRegistration(userId: string, note?: string): Promise<Result> {
  return setApproval(userId, false, note);
}

/** Admin mengatur PIN baru untuk jamaah (mis. jamaah tidak bisa menerima WA). */
export async function resetJamaahPin(formData: FormData): Promise<Result> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, error: 'Akses ditolak: hanya admin.' };

  const userId = formData.get('userId');
  const pin = formData.get('newPin');
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) return { success: false, error: 'Data tidak valid.' };
  const pinError = validatePin(pin);
  if (pinError) return { success: false, error: pinError };

  const adminClient = createAdminClient();
  const { data: authUser, error: getError } = await adminClient.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (getError || !email) return { success: false, error: 'Akun login jamaah tidak ditemukan.' };

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: derivePinPassword(email, pin as string),
  });
  if (error) {
    console.error('Admin PIN reset failed:', error);
    return { success: false, error: 'Gagal menyimpan PIN baru.' };
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, phone_normalized')
    .eq('id', userId)
    .single();
  await adminClient.from('profiles').update({ pin_set_at: new Date().toISOString() }).eq('id', userId);
  const phone = email.split('@')[0];
  await clearLoginFailures(phone);

  await adminClient.from('audit_logs').insert({
    admin_id: admin.id,
    action: 'reset PIN',
    target_id: userId,
    details: `Admin mengatur ulang PIN jamaah: ${profile?.full_name || '-'} (${profile?.phone_normalized || phone})`,
    created_at: new Date().toISOString(),
  });

  revalidatePath(`/admin/jamaah/${userId}`);
  return { success: true };
}
