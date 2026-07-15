import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { FileText, Filter, Search } from 'lucide-react';
import Link from 'next/link';

export default async function AdminRiwayatTransaksiPage({ searchParams }: { searchParams: Promise<{ waktu?: string }> }) {
  const resolvedParams = await searchParams;
  const filterWaktu = resolvedParams.waktu || 'all';

  const supabase = await createClient();

  let query = supabase
    .from('transactions')
    .select('*, profiles!transactions_user_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false });

  if (filterWaktu === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte('created_at', today.toISOString());
  } else if (filterWaktu === 'month') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    query = query.gte('created_at', startOfMonth.toISOString());
  }

  // Limit to last 500 transactions for performance
  query = query.limit(500);

  const { data: transactions } = await query;

  // Hitung total transaksi harian jika filter today
  const totalAmount = transactions?.filter(tx => tx.status === 'verified').reduce((sum, tx) => sum + tx.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Semua Transaksi</h1>
            <p className="text-slate-500 mt-1 text-sm">Lihat seluruh riwayat setoran masuk dari semua jamaah.</p>
          </div>
        </div>

        <form method="GET" className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select name="waktu" defaultValue={filterWaktu} className="text-sm bg-transparent border-none focus:ring-0 text-slate-700 cursor-pointer">
            <option value="today">Hari Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="all">Semua Waktu</option>
          </select>
          <button type="submit" className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-200 transition-colors">Filter</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Setoran Terverifikasi ({filterWaktu === 'today' ? 'Hari Ini' : filterWaktu === 'month' ? 'Bulan Ini' : 'Semua Waktu'})</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Jumlah Transaksi</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{transactions?.length || 0} Trx</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Tanggal</th>
                <th className="px-4 py-2.5 font-semibold">Jamaah</th>
                <th className="px-4 py-2.5 font-semibold">Metode</th>
                <th className="px-4 py-2.5 font-semibold">Jumlah</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions && transactions.length > 0 ? (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/jamaah/${tx.user_id}`} className="font-medium text-indigo-600 hover:underline">
                        {tx.profiles?.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-sm text-slate-600 capitalize">{tx.method}</div>
                    </td>
                    <td className={`px-4 py-2.5 font-bold ${tx.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatCurrency(tx.amount)}
                      {tx.amount < 0 && <div className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium mt-1 w-fit">Penarikan</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                        ${tx.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 
                          tx.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="font-medium text-slate-500">Belum ada transaksi</p>
                      <p className="text-xs mt-1">Tidak ada data transaksi pada rentang waktu ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
