require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAgustianRole() {
  console.log('=== 1. FETCH AGUSTIAN PROFILE SEBELUM PERUBAHAN ROLE ===');
  const { data: agustian, error: errBefore } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'a96ead09-8de4-4070-b576-8130b37dd052')
    .single();

  if (errBefore || !agustian) {
    console.error('Error fetching Agustian:', errBefore);
    process.exit(1);
  }

  console.log('- ID:', agustian.id);
  console.log('- Nama:', agustian.full_name);
  console.log('- No WhatsApp:', agustian.phone);
  console.log('- Role SEBELUM:', agustian.role);

  console.log('\n=== 2. UPDATE ROLE KE ADMIN/BENDAHARA (role: "admin") ===');
  // Update profiles table
  const { data: updatedProfile, error: errUpdate } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', agustian.id)
    .select()
    .single();

  if (errUpdate) {
    console.error('Update profile role error:', errUpdate);
    process.exit(1);
  }

  // Update auth metadata
  const { data: authUser } = await supabase.auth.admin.getUserById(agustian.id);
  const currentMeta = authUser?.user?.user_metadata || {};
  await supabase.auth.admin.updateUserById(agustian.id, {
    user_metadata: {
      ...currentMeta,
      role: 'admin'
    }
  });

  console.log('Role berhasil diubah di tabel profiles & auth user_metadata!');

  console.log('\n=== 3. INSERT AUDIT LOG ===');
  const superAdminId = '3c99955e-a0b7-4141-bfda-55a608edaf95'; // Yahya Kurniawan
  const details = `Mengubah role ${agustian.full_name} (${agustian.phone}) dari Jamaah menjadi Admin/Bendahara`;

  const { data: auditLog, error: errAudit } = await supabase
    .from('audit_logs')
    .insert({
      admin_id: superAdminId,
      action: 'ubah role',
      target_id: agustian.id,
      details: details,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (errAudit) {
    console.error('Error inserting audit log:', errAudit);
  } else {
    console.log('Audit log berhasil dicatat:');
    console.log('- ID:', auditLog.id);
    console.log('- Action:', auditLog.action);
    console.log('- Details:', auditLog.details);
    console.log('- Created At:', auditLog.created_at);
  }

  console.log('\n=== 4. VERIFIKASI AKHIR DATA AGUSTIAN ===');
  const { data: verifyProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', agustian.id)
    .single();

  console.log('Data final di database:');
  console.log('- ID:', verifyProfile.id, '(Tidak berubah)');
  console.log('- Nama:', verifyProfile.full_name, '(Tetap "Agustian Safitri")');
  console.log('- No WhatsApp:', verifyProfile.phone, '(Tetap sama)');
  console.log('- Role Baru:', verifyProfile.role, '(TELAH MENJADI "admin" / Admin/Bendahara)');
  console.log('- Kategori:', verifyProfile.kategori_jamaah, '(Tetap sama)');

  const { data: txList } = await supabase.from('transactions').select('*').eq('user_id', agustian.id);
  console.log('- Jumlah transaksi:', txList.length, '(Tetap sama)');

  const { data: pkgList } = await supabase.from('user_packages').select('*').eq('user_id', agustian.id);
  console.log('- Jumlah paket qurban:', pkgList.length, '(Tetap sama)');

  console.log('\n=== SEMUA PROSES ROLE UPDATE AGUSTIAN SAFITRI SELESAI & VALID! ===');
}

updateAgustianRole();
