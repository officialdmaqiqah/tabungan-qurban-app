'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { UserRole, ROLE_LABELS, getEffectiveRole, isSuperAdmin } from '@/lib/roles';

export async function updateUserRole(formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const targetUserId = formData.get('userId') as string;
    const newRole = formData.get('role') as UserRole;

    if (!targetUserId || !newRole) {
      return { success: false, error: 'Data tidak lengkap.' };
    }

    if (!['jamaah', 'admin', 'super_admin'].includes(newRole)) {
      return { success: false, error: 'Pilihan role tidak valid.' };
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
        error: 'Akses ditolak: Hanya Super Admin yang berhak menetapkan dan mengubah role pengguna.',
      };
    }

    // 2. Fetch target profile
    const adminClient = createAdminClient();
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return { success: false, error: 'Data pengguna target tidak ditemukan.' };
    }

    // Role efektif hanya berasal dari profiles.role (lihat lib/roles.ts)
    const oldEffectiveRole = getEffectiveRole(targetProfile.role);

    if (oldEffectiveRole === newRole) {
      return { success: false, error: `Pengguna sudah memiliki role ${ROLE_LABELS[newRole]}.` };
    }

    // Prevent Super Admin from locking themselves out
    if (user.id === targetUserId && newRole !== 'super_admin') {
      return {
        success: false,
        error: 'Anda tidak dapat menurunkan role Super Admin Anda sendiri untuk menghindari hilangnya akses.',
      };
    }

    // 3. Update profiles table (sumber kebenaran role)
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (profileError) {
      if (profileError.message?.includes('profiles_role_check') || profileError.code === '23514') {
        return {
          success: false,
          error:
            "Database belum mendukung role ini (constraint profiles_role_check). Jalankan migrasi " +
            "supabase/migrations/20261029000000_update_role_management.sql di Supabase SQL Editor, lalu coba lagi.",
        };
      }
      throw profileError;
    }

    // 4. Simpan salinan role di app_metadata (hanya bisa diubah oleh service role,
    //    tidak seperti user_metadata yang bisa diubah sendiri oleh pengguna).
    //    Salinan ini bersifat informatif; aplikasi tetap membaca profiles.role.
    const { data: targetAuthUser } = await adminClient.auth.admin.getUserById(targetUserId);
    const currentAppMeta = targetAuthUser?.user?.app_metadata || {};
    const { error: metaError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      app_metadata: {
        ...currentAppMeta,
        role: newRole,
      },
    });
    if (metaError) {
      console.error('Gagal menyimpan salinan role ke app_metadata:', metaError);
    }

    // 5. Insert audit log
    const oldRoleLabel = ROLE_LABELS[oldEffectiveRole] || oldEffectiveRole;
    const newRoleLabel = ROLE_LABELS[newRole] || newRole;
    const targetName = targetProfile.full_name || 'Jamaah';
    const targetPhone = targetProfile.phone || '-';

    await adminClient.from('audit_logs').insert({
      admin_id: user.id,
      action: 'ubah role',
      target_id: targetUserId,
      details: `Mengubah role ${targetName} (${targetPhone}) dari ${oldRoleLabel} menjadi ${newRoleLabel}`,
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/jamaah');
    revalidatePath('/admin/audit-log');

    return {
      success: true,
      message: `Role ${targetName} berhasil diubah menjadi ${newRoleLabel}.`,
    };
  } catch (err: any) {
    console.error('Error updating user role:', err);
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan saat memperbarui role pengguna.',
    };
  }
}
