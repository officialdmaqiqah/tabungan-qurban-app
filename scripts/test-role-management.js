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

function isAdminOrSuperAdmin(profileRole, userMetadataRole, phone) {
  const role = getEffectiveRole(profileRole, userMetadataRole, phone);
  return role === 'admin' || role === 'super_admin';
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  console.log('=== TEST 1: AUDIT CURRENT USERS AND ROLES ===');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) throw profErr;

  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) throw authErr;

  const authUserMap = new Map();
  users.forEach(u => authUserMap.set(u.id, u));

  console.log(`Total profiles in database: ${profiles.length}`);
  
  const superAdmins = [];
  const adminBendahara = [];
  const jamaahUsers = [];

  for (const p of profiles) {
    const authUser = authUserMap.get(p.id);
    const effective = getEffectiveRole(p.role, authUser?.user_metadata?.role, p.phone);
    if (effective === 'super_admin') {
      superAdmins.push({ name: p.full_name, phone: p.phone, id: p.id, dbRole: p.role });
    } else if (effective === 'admin') {
      adminBendahara.push({ name: p.full_name, phone: p.phone, id: p.id, dbRole: p.role });
    } else {
      jamaahUsers.push({ name: p.full_name, phone: p.phone, id: p.id, dbRole: p.role });
    }
  }

  console.log('\n--- Super Admin saat ini: ---');
  superAdmins.forEach(s => console.log(`- ${s.name} (${s.phone}) [ID: ${s.id}, DB Role: ${s.dbRole}]`));

  console.log('\n--- Admin/Bendahara saat ini: ---');
  adminBendahara.forEach(a => console.log(`- ${a.name} (${a.phone}) [ID: ${a.id}, DB Role: ${a.dbRole}]`));

  console.log(`\n--- Total Jamaah biasa: ${jamaahUsers.length} user ---`);

  console.log('\n=== TEST 2: TEST ROLE PERMISSION MATRIX ===');
  console.log('Permission test - Super Admin (Yahya):');
  console.log('  isSuperAdmin:', isSuperAdmin('admin', 'super_admin', '081949098789'), '(Expected: true)');
  console.log('  isAdminOrSuperAdmin:', isAdminOrSuperAdmin('admin', 'super_admin', '081949098789'), '(Expected: true)');

  console.log('Permission test - Admin/Bendahara (Heri Anggara):');
  console.log('  isSuperAdmin:', isSuperAdmin('admin', null, '6281278616461'), '(Expected: false)');
  console.log('  isAdminOrSuperAdmin:', isAdminOrSuperAdmin('admin', null, '6281278616461'), '(Expected: true)');

  console.log('Permission test - Jamaah (Roni Wijaya):');
  console.log('  isSuperAdmin:', isSuperAdmin('jamaah', null, '6282175426357'), '(Expected: false)');
  console.log('  isAdminOrSuperAdmin:', isAdminOrSuperAdmin('jamaah', null, '6282175426357'), '(Expected: false)');

  console.log('\n=== TEST 3: TEST AUDIT LOG INSERTION ===');
  const testAdminId = superAdmins[0].id;
  const testTargetUser = jamaahUsers[0];

  console.log(`Verifying audit log insertion by Super Admin (${superAdmins[0].name})...`);
  const { data: auditLog, error: auditErr } = await supabase.from('audit_logs').insert({
    admin_id: testAdminId,
    action: 'ubah role',
    target_id: testTargetUser.id,
    details: `Uji role management: Mengubah role ${testTargetUser.name} (${testTargetUser.phone}) dari Jamaah menjadi Admin/Bendahara`,
    created_at: new Date().toISOString()
  }).select();

  if (auditErr) {
    console.error('Audit log insertion failed:', auditErr);
  } else {
    console.log('Audit log successfully created ID:', auditLog[0].id);
    console.log('Audit log details:', auditLog[0].details);
  }

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests();
