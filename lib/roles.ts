export type UserRole = 'jamaah' | 'admin' | 'super_admin';

export const ROLE_LABELS: Record<UserRole, string> = {
  jamaah: 'Jamaah',
  admin: 'Admin/Bendahara',
  super_admin: 'Super Admin',
};

/**
 * Menentukan role efektif pengguna.
 *
 * KEAMANAN: Role HANYA diambil dari kolom `profiles.role`.
 * - `user.user_metadata.role` TIDAK boleh dipercaya karena pengguna bisa
 *   mengubahnya sendiri lewat `supabase.auth.updateUser({ data: { role } })`.
 * - Nomor HP juga TIDAK boleh dijadikan dasar role karena kolom phone dapat
 *   diubah oleh pengguna.
 * Parameter `_userMetadataRole` dan `_phone` dipertahankan hanya agar
 * pemanggil lama tetap kompatibel; nilainya sengaja diabaikan.
 */
export function getEffectiveRole(
  profileRole?: string | null,
  _userMetadataRole?: string | null, // eslint-disable-line @typescript-eslint/no-unused-vars
  _phone?: string | null // eslint-disable-line @typescript-eslint/no-unused-vars
): UserRole {
  if (profileRole === 'super_admin') return 'super_admin';
  if (profileRole === 'admin') return 'admin';
  return 'jamaah';
}

export function isSuperAdmin(
  profileRole?: string | null,
  userMetadataRole?: string | null,
  phone?: string | null
): boolean {
  return getEffectiveRole(profileRole, userMetadataRole, phone) === 'super_admin';
}

export function isAdminOrSuperAdmin(
  profileRole?: string | null,
  userMetadataRole?: string | null,
  phone?: string | null
): boolean {
  const role = getEffectiveRole(profileRole, userMetadataRole, phone);
  return role === 'admin' || role === 'super_admin';
}
