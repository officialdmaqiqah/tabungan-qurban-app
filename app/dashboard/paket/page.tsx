import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Lock } from 'lucide-react';
import PackageCard from './PackageCard';

export default async function PaketJamaahPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch all available packages
  const { data: allPackages } = await supabase
    .from('qurban_packages')
    .select('*')
    .order('price', { ascending: true });

  // 2. Fetch user's selected packages
  const { data: userPackages } = await supabase
    .from('user_packages')
    .select('package_id, quantity')
    .eq('user_id', user.id);

  const selectedPackagesMap = userPackages?.reduce((acc: any, up: any) => {
    acc[up.package_id] = up.quantity;
    return acc;
  }, {}) || {};

  async function selectPackage(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const packageId = formData.get('package_id') as string;
    const quantity = parseInt(formData.get('quantity') as string) || 1;

    if (user && packageId) {
      // Create user_package entry
      await supabase.from('user_packages').insert({
        user_id: user.id,
        package_id: packageId,
        quantity: quantity
      });
      revalidatePath('/dashboard/paket');
      revalidatePath('/dashboard');
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pilih Paket Qurban</h1>
        <p className="text-slate-500">Silakan pilih paket qurban yang ingin Anda tabung tahun ini. Anda bisa memilih lebih dari satu paket.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="text-amber-800 text-sm">
          <p className="font-semibold">Perhatian</p>
          <p>Paket yang sudah Anda pilih akan <strong>terkunci</strong> dan menjadi target tabungan Anda. Jika Anda ingin mengubah atau membatalkan paket yang sudah dipilih, silakan hubungi Admin Masjid.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allPackages?.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-500">
            Belum ada paket qurban yang tersedia saat ini.
          </div>
        ) : (
          allPackages?.map((pkg) => (
            <PackageCard 
              key={pkg.id} 
              pkg={pkg} 
              selectedQuantity={selectedPackagesMap[pkg.id] || 0} 
              onSelect={async (id, qty) => {
                'use server';
                const fd = new FormData();
                fd.append('package_id', id);
                fd.append('quantity', qty.toString());
                await selectPackage(fd);
              }} 
            />
          ))
        )}
      </div>
    </div>
  );
}
