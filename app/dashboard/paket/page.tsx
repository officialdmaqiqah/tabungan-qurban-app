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
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Pilih Paket Qurban</h1>
        <p className="text-sm text-slate-500 max-w-2xl">Silakan pilih paket qurban yang ingin Anda tabung tahun ini. Anda bisa memilih lebih dari satu paket untuk disesuaikan dengan niat qurban Anda.</p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5 md:p-6 rounded-[2rem] flex flex-col sm:flex-row items-start gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-amber-500 border border-amber-100/50">
          <Lock className="w-6 h-6" />
        </div>
        <div className="text-amber-900 text-sm">
          <p className="font-bold text-base mb-1">Perhatian</p>
          <p className="leading-relaxed opacity-80">Paket yang sudah Anda pilih akan <strong>terkunci</strong> dan menjadi target tabungan Anda. Jika Anda ingin mengubah atau membatalkan paket yang sudah dipilih, silakan hubungi Admin Masjid.</p>
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
