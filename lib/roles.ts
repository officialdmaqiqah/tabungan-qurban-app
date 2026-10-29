export type UserRole = 'jamaah' | 'admin' | 'super_admin';

export const ROLE_LABELS: Record<UserRole, string> = {
  jamaah: 'Jamaah',
  admin: 'Admin/Bendahara',
  super_admin: 'Super Admin',
};

// Known initial Super Admin phone numbers (Yahya Kurniawan)
export const SUPER_ADMIN_PHONES = ['081949098789', '6281949098789'];

export function getEffectiveRole(
  profileRole?: string | null,
  userMetadataRole?: string | null,
  phone?: string | null
): UserRole {
  if (profileRole === 'super_admin' || userMetadataRole === 'super_admin') {
    return 'super_admin';
  }
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (SUPER_ADMIN_PHONES.some(p => p.replace(/\D/g, '') === cleanPhone)) {
      return 'super_admin';
    }
  }
  if (profileRole === 'admin' || userMetadataRole === 'admin') {
    return 'admin';
  }
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
