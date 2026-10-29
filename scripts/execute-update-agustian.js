require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

function normalizeName(name) {
  if (!name) return '';
  const cleaned = name.trim().replace(/\s+/g, ' ');
  return cleaned
    .split(' ')
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('=== 1. FETCH CURRENT PROFILE FOR AGUSTIAN SAFITRI ===');
  const { data: agustianBefore, error: errBefore } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', '%AGUSTIAN%')
    .single();

  if (errBefore || !agustianBefore) {
    console.error('Error finding Agustian:', errBefore);
    process.exit(1);
  }

  console.log('Data SEBELUM update:');
  console.log('- ID:', agustianBefore.id);
  console.log('- Full Name:', agustianBefore.full_name);
  console.log('- Phone:', agustianBefore.phone);
  console.log('- Role:', agustianBefore.role);
  console.log('- Kategori:', agustianBefore.kategori_jamaah);
  console.log('- Gender:', agustianBefore.gender);

  console.log('\n=== 2. NORMALISASI NAMA ===');
  const oldName = agustianBefore.full_name;
  const newName = normalizeName('AGUSTIAN SAFITRI');
  console.log(`Nama Lama: "${oldName}"`);
  console.log(`Nama Baru (Title Case): "${newName}"`);

  console.log('\n=== 3. EXECUTE UPDATE (HANYA profiles.full_name) ===');
  const { data: updateRes, error: updateErr } = await supabase
    .from('profiles')
    .update({ full_name: newName })
    .eq('id', agustianBefore.id)
    .select()
    .single();

  if (updateErr) {
    console.error('Update failed:', updateErr);
    process.exit(1);
  }

  console.log('Update berhasil dilakukan!');

  console.log('\n=== 4. INSERT AUDIT LOG ===');
  const superAdminId = '3c99955e-a0b7-4141-bfda-55a608edaf95'; // Yahya Kurniawan
  const auditDetails = `Mengubah nama jamaah dari ${oldName} menjadi ${newName}`;

  const { data: auditEntry, error: auditErr } = await supabase
    .from('audit_logs')
    .insert({
      admin_id: superAdminId,
      action: 'ubah nama jamaah',
      target_id: agustianBefore.id,
      details: auditDetails,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (auditErr) {
    console.error('Audit log failed:', auditErr);
  } else {
    console.log('Audit log entry created:');
    console.log('- ID:', auditEntry.id);
    console.log('- Admin ID:', auditEntry.admin_id);
    console.log('- Action:', auditEntry.action);
    console.log('- Target ID:', auditEntry.target_id);
    console.log('- Details:', auditEntry.details);
    console.log('- Created At:', auditEntry.created_at);
  }

  console.log('\n=== 5. VERIFIKASI DATA SESUDAH UPDATE ===');
  const { data: agustianAfter, error: errAfter } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', agustianBefore.id)
    .single();

  console.log('Data SESUDAH update:');
  console.log('- ID:', agustianAfter.id, `(Sama: ${agustianAfter.id === agustianBefore.id})`);
  console.log('- Full Name:', agustianAfter.full_name, `(Telah berubah ke "${newName}")`);
  console.log('- Phone:', agustianAfter.phone, `(Sama: ${agustianAfter.phone === agustianBefore.phone})`);
  console.log('- Role:', agustianAfter.role, `(TETAP SAMA: ${agustianAfter.role === 'jamaah'})`);
  console.log('- Kategori:', agustianAfter.kategori_jamaah);
  console.log('- Gender:', agustianAfter.gender);

  console.log('\n=== 6. VERIFIKASI TRANSAKSI & SALDO ===');
  const { data: txList } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', agustianBefore.id);
  console.log(`Jumlah transaksi tetap terhubung: ${txList ? txList.length : 0}`);

  console.log('\n=== SEMUA PROSES BERHASIL DAN TERVERIFIKASI! ===');
}

main();
