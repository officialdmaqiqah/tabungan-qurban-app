import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Package } from 'lucide-react';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';

export default async function AdminPaketPage() {
  const supabase = await createClient();

  // Fetch existing packages
  const { data: packages, error } = await supabase
    .from('qurban_packages')
    .select('*')
    .order('price', { ascending: true });

  async function addPackage(formData: FormData) {
    'use server';
    const supabase = await createClient();
    
    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(priceStr.replace(/[^0-9]/g, ''));

    if (name && price > 0) {
      await supabase.from('qurban_packages').insert({
        name,
        price,
        description
      });
      revalidatePath('/admin/paket');
    }
  }

  async function deletePackage(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const id = formData.get('id') as string;
    
    if (id) {
      await supabase.from('qurban_packages').delete().eq('id', id);
      revalidatePath('/admin/paket');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manajemen Paket Qurban</h1>
        <p className="text-slate-500">Buat dan atur paket qurban yang bisa dipilih oleh jamaah.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Form Tambah Paket */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Tambah Paket
            </h2>
            <form action={addPackage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Paket</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="Misal: Sapi Tipe A"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Harga (Rp)</label>
                <input 
                  type="number" 
                  name="price" 
                  required 
                  placeholder="3000000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea 
                  name="description"
                  rows={3} 
                  placeholder="Estimasi berat..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
                ></textarea>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white font-medium py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Simpan Paket
              </button>
            </form>
          </div>
        </div>

        {/* Daftar Paket */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                Daftar Paket Tersedia
              </h2>
            </div>
            
            {error && <div className="p-4 text-red-500">{error.message}</div>}
            
            <div className="divide-y divide-slate-100">
              {packages?.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Belum ada paket qurban yang dibuat.
                </div>
              ) : (
                packages?.map((pkg) => (
                  <div key={pkg.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-slate-900">{pkg.name}</h3>
                      <p className="text-emerald-600 font-bold">{formatCurrency(pkg.price)}</p>
                      {pkg.description && (
                        <p className="text-sm text-slate-500 mt-1">{pkg.description}</p>
                      )}
                    </div>
                    
                    <form action={deletePackage}>
                      <input type="hidden" name="id" value={pkg.id} />
                      <DeleteConfirmButton 
                        title="Hapus Paket Qurban?" 
                        message={`Apakah Anda yakin ingin menghapus paket "${pkg.name}"? Ini tidak akan menghapus data jamaah yang sudah memilihnya, tapi paket ini tidak akan bisa dipilih lagi.`}
                        iconSize="w-5 h-5"
                      />
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
