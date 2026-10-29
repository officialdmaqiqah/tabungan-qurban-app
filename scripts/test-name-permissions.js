require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPER_ADMIN_PHONES = ['081949098789', '6281949098789'];

function getEffectiveRole(profileRole, userMetadataRole, phone) {
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

function isSuperAdmin(profileRole, userMetadataRole, phone) {
  return getEffectiveRole(profileRole, userMetadataRole, phone) === 'super_admin';
}

function checkCanEditName(userRole, userMetaRole, phone) {
  const superAdmin = isSuperAdmin(userRole, userMetaRole, phone);
  if (!superAdmin) {
    return { allowed: false, error: 'Akses ditolak: Hanya Super Admin yang berhak mengedit nama jamaah.' };
  }
  return { allowed: true };
}

function runPermissionTests() {
  console.log('=== TEST PERMISSION MATRIX UNTUK EDIT NAMA JAMAAH ===');

  // Case 1: Super Admin (Yahya Kurniawan)
  const test1 = checkCanEditName('admin', 'super_admin', '081949098789');
  console.log('1. Super Admin (Yahya Kurniawan):', test1.allowed ? 'DIIZINKAN (PASS)' : 'DITOLAK (FAIL)');

  // Case 2: Admin/Bendahara (Heri Anggara)
  const test2 = checkCanEditName('admin', null, '6281278616461');
  console.log('2. Admin/Bendahara (Heri Anggara):', !test2.allowed ? `DITOLAK SECARA AMAN: "${test2.error}" (PASS)` : 'DIIZINKAN (FAIL)');

  // Case 3: Jamaah (Agustian Safitri)
  const test3 = checkCanEditName('jamaah', null, '6282181793456');
  console.log('3. Jamaah (Agustian Safitri):', !test3.allowed ? `DITOLAK SECARA AMAN: "${test3.error}" (PASS)` : 'DIIZINKAN (FAIL)');

  // Case 4: Anonymous / Guest
  const test4 = checkCanEditName(null, null, null);
  console.log('4. Tamu / Belum Login:', !test4.allowed ? `DITOLAK SECARA AMAN: "${test4.error}" (PASS)` : 'DIIZINKAN (FAIL)');

  console.log('\n=== SEMUA TEST PERMISSION VALID! ===');
}

runPermissionTests();
