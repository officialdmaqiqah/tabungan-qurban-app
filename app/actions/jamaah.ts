'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { isSuperAdmin } from '@/lib/roles';
import { normalizeName } from '@/lib/utils';

export async function updateJamaahName(
  formData: FormData
): Promise<{ success: boolean; error?: string; message?: string; normalizedName?: string }> {
  try {
    const targetUserId = formData.get('userId') as string;
    const rawNewName = formData.get('newName') as string;

    if (!targetUserId || !rawNewName) {
      return { success: false, error: 'Data tidak lengkap.' };
    }

    // 1. Verify caller authentication & Super Admin status
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Anda harus login terlebih dahulu.' };
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, phone, full_name')
      .eq('id', user.id)
      .single();

    const callerIsSuperAdmin = isSuperAdmin(
      callerProfile?.role,
      user.user_metadata?.role,
      callerProfile?.phone || user.phone
    );

    if (!callerIsSuperAdmin) {
      return {
        success: false,
        error: 'Akses ditolak: Hanya Super Admin yang berhak mengedit nama jamaah.',
      };
    }

    // 2. Normalize name to Title Case & trim/strip extra whitespace
    const normalizedNewName = normalizeName(rawNewName);
    if (!normalizedNewName || normalizedNewName.length < 2) {
      return { success: false, error: 'Nama jamaah baru tidak valid (minimal 2 karakter).' };
    }

    // 3. Fetch target profile
    const adminClient = createAdminClient();
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return { success: false, error: 'Data jamaah tidak ditemukan.' };
    }

    const oldName = targetProfile.full_name || '';
    if (oldName === normalizedNewName) {
      return { success: false, error: 'Nama baru sama dengan nama saat ini.' };
    }

    // 4. Update ONLY profiles.full_name
    // (JANGAN mengubah user id, nomor WhatsApp, role, saldo, transaksi, target qurban, dll.)
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ full_name: normalizedNewName })
      .eq('id', targetUserId);

    if (updateError) {
      throw updateError;
    }

    // 5. Insert audit log
    await adminClient.from('audit_logs').insert({
      admin_id: user.id,
      action: 'ubah nama jamaah',
      target_id: targetUserId,
      details: `Mengubah nama jamaah dari ${oldName} menjadi ${normalizedNewName}`,
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/jamaah');
    revalidatePath('/admin/audit-log');

    return {
      success: true,
      message: 'Nama jamaah berhasil diperbarui',
      normalizedName: normalizedNewName,
    };
  } catch (err: any) {
    console.error('Error updating jamaah name:', err);
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan saat memperbarui nama jamaah.',
    };
  }
}
