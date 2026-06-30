const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('Seeding demo data for UAT...');

  // 1. Create Packages
  const packages = [
    { name: 'Kambing Standar', price: 2500000, description: 'Satu ekor kambing kelas standar' },
    { name: '1/7 Sapi', price: 3000000, description: 'Satu per tujuh bagian sapi' },
    { name: 'Nominal Custom', price: 0, description: 'Tentukan target tabungan sendiri (minimum 1 juta)' }
  ];

  const { data: existingPackages } = await supabase.from('qurban_packages').select('*');
  let insertedPackages = [...existingPackages];

  for (const pkg of packages) {
    if (!insertedPackages.find(p => p.name === pkg.name)) {
      const { data } = await supabase.from('qurban_packages').insert(pkg).select();
      if (data) insertedPackages.push(data[0]);
    }
  }
  
  console.log('Created packages:', insertedPackages.length);

  const kambingId = insertedPackages.find(p => p.name === 'Kambing Standar').id;
  const sapiId = insertedPackages.find(p => p.name === '1/7 Sapi').id;

  // Helper to create user
  async function createDemoUser(phone, name, role) {
    const email = `${phone}@qurban.makt.id`;
    const password = 'Password123';
    
    // Check if exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    let user = existing.users.find(u => u.email === email);
    
    if (!user) {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, phone }
      });
      if (authErr) throw authErr;
      user = authData.user;
    }

    // Ensure role is correct (trigger creates as jamaah by default)
    if (role === 'admin') {
      await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    }
    return user.id;
  }

  // 2. Create Users
  try {
    const adminId = await createDemoUser('628111111111', 'Admin Bendahara', 'admin');
    console.log('Admin created.');

    const jamaah0Id = await createDemoUser('628222222222', 'Jamaah Baru (0%)', 'jamaah'); // 0%
    const jamaah50Id = await createDemoUser('628333333333', 'Jamaah Setengah (50%)', 'jamaah'); // 50%
    const jamaah90Id = await createDemoUser('628444444444', 'Jamaah Hampir Lunas (90%)', 'jamaah'); // 90%
    const jamaahLunasId = await createDemoUser('628555555555', 'Jamaah Lunas (100%)', 'jamaah'); // Lunas
    const jamaahPendingId = await createDemoUser('628666666666', 'Jamaah Pending Setoran', 'jamaah'); // Pending/Rejected
    
    console.log('Jamaah demo created.');

    // 3. Assign Packages to Jamaah
    await supabase.from('user_packages').upsert([
      { user_id: jamaah0Id, package_id: kambingId },
      { user_id: jamaah50Id, package_id: sapiId },
      { user_id: jamaah90Id, package_id: sapiId },
      { user_id: jamaahLunasId, package_id: kambingId },
      { user_id: jamaahPendingId, package_id: sapiId }
    ], { onConflict: 'user_id,package_id' });

    // 4. Create Transactions
    // Delete existing transactions for these users to prevent duplicates if script runs twice
    const userIds = [jamaah0Id, jamaah50Id, jamaah90Id, jamaahLunasId, jamaahPendingId];
    await supabase.from('transactions').delete().in('user_id', userIds);

    const txs = [
      // 50% (Sapi = 3000000 -> 1500000)
      { user_id: jamaah50Id, amount: 1500000, method: 'tunai', status: 'verified', verified_by: adminId, verified_at: new Date() },
      // 90% (Sapi = 3000000 -> 2700000)
      { user_id: jamaah90Id, amount: 1000000, method: 'transfer', status: 'verified', verified_by: adminId, verified_at: new Date() },
      { user_id: jamaah90Id, amount: 1700000, method: 'tunai', status: 'verified', verified_by: adminId, verified_at: new Date() },
      // 100% (Kambing = 2500000)
      { user_id: jamaahLunasId, amount: 2500000, method: 'transfer', status: 'verified', verified_by: adminId, verified_at: new Date() },
      // Pending 
      { user_id: jamaahPendingId, amount: 500000, method: 'transfer', status: 'pending' },
      // Rejected
      { user_id: jamaahPendingId, amount: 1000000, method: 'transfer', status: 'rejected', verified_by: adminId, verified_at: new Date(), admin_note: 'Bukti transfer buram/tidak terbaca' }
    ];

    await supabase.from('transactions').insert(txs);
    console.log('Transactions created.');
    
    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

seed();
