import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import SearchAndFilter from '../SearchAndFilter';
import Pagination from '../Pagination';
import { Users, Eye } from 'lucide-react';
import Link from 'next/link';

export default async function AdminJamaahPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const itemsPerPage = 10;
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  const supabase = await createClient();

  // Fetch all jamaah with pagination and search
  let query = supabase
    .from('profiles')
    .select('*, user_packages(package_id, quantity, qurban_packages(name, price))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: jamaahList, count: totalJamaah } = await query;

  // Fetch transactions for the current page to calculate progress
  const jamaahIds = jamaahList?.map(j => j.id) || [];
  const { data: transactions } = await supabase
    .from('transactions')
    .select('user_id, amount')
    .in('user_id', jamaahIds)
    .eq('status', 'verified');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Jamaah</h1>
          <p className="text-sm text-slate-500">Kelola daftar jamaah dan pilihan paket Qurban mereka.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <SearchAndFilter />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Jamaah & Kategori</th>
                <th className="px-4 py-3 font-semibold">No HP</th>
                <th className="px-4 py-3 font-semibold">Progres</th>
                <th className="px-4 py-3 font-semibold">Paket Pilihan</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jamaahList && jamaahList.length > 0 ? (
                jamaahList.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">{j.full_name}</div>
                      {j.kategori_jamaah ? (
                        <div className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {j.kategori_jamaah}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-1 italic">Kategori blm diatur</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{j.phone}</td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const targetAmount = j.user_packages?.reduce((sum: number, p: any) => sum + ((Number(p.qurban_packages?.price) || 0) * (p.quantity || 1)), 0) || 0;
                        const totalTabungan = transactions?.filter(t => t.user_id === j.id).reduce((sum, t) => sum + Number(t.amount), 0) || 0;
                        const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((totalTabungan / targetAmount) * 100)) : 0;
                        
                        return (
                          <div className="font-bold text-slate-700">{progressPercent}%</div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2.5">
                      {j.user_packages && j.user_packages.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {j.user_packages.map((up: any) => (
                            <span key={up.package_id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {up.qurban_packages?.name} (x{up.quantity})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Belum memilih</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link 
                        href={`/admin/jamaah/${j.id}`}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg font-medium transition-all shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="font-medium text-slate-500">Tidak ada jamaah ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50/50">
          <Pagination totalItems={totalJamaah || 0} itemsPerPage={itemsPerPage} />
        </div>
      </div>
    </div>
  );
}
