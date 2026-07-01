import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { Users, Wallet, Target, Clock, ShieldAlert, Check, Download } from 'lucide-react';

export default async function AdminDashboardOverview() {
  const supabase = await createClient();

  // Run all independent queries concurrently to eliminate waterfalls
  const [
    { count: totalJamaah },
    { data: verifiedTxs },
    { count: pendingCount },
    { data: userPackages }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'jamaah'),
    supabase.from('transactions').select('amount').eq('status', 'verified'),
    supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('user_packages').select('quantity, qurban_packages(price)')
  ]);

  const totalTerkumpul = verifiedTxs?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

  const totalTarget = userPackages?.reduce((sum, pkg: any) => {
    const price = Number(pkg.qurban_packages?.price) || 0;
    const qty = pkg.quantity || 1;
    return sum + (price * qty);
  }, 0) || 0;

  // Calculate overall progress
  const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((totalTerkumpul / totalTarget) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard Ringkasan</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Pantau perkembangan tabungan qurban jamaah secara real-time.</p>
        </div>
        <a 
          href="/admin/export"
          download
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 md:py-2 rounded-xl md:rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm w-full md:w-auto shrink-0 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Export Laporan CSV
        </a>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jamaah */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out -z-10"></div>
          <div className="flex items-center gap-4 mb-4 z-10">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Jamaah</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalJamaah || 0}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 z-10">Jamaah yang telah mendaftar di sistem.</p>
        </div>

        {/* Total Terkumpul */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out -z-10"></div>
          <div className="flex items-center gap-4 mb-4 z-10">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Terkumpul</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalTerkumpul)}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 z-10">Dana setoran yang sudah diverifikasi admin.</p>
        </div>

        {/* Total Target */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out -z-10"></div>
          <div className="flex items-center gap-4 mb-4 z-10">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Target Keseluruhan</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalTarget)}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 z-10">Total nilai seluruh paket qurban jamaah.</p>
        </div>

        {/* Menunggu Verifikasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out -z-10"></div>
          <div className="flex items-center gap-4 mb-4 z-10">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Perlu Verifikasi</p>
              <h3 className="text-3xl font-bold text-slate-900">{pendingCount || 0}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 z-10">Transaksi setoran yang menunggu aksi Anda.</p>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-lg border border-slate-700 text-white mt-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Progress Qurban Bersama</h3>
              <p className="text-slate-400 text-sm">Persentase dana yang sudah terkumpul dari total target seluruh jamaah.</p>
            </div>
            <div className="text-4xl font-black text-emerald-400">{progressPercent}%</div>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-6 overflow-hidden backdrop-blur-sm border border-slate-600/50 p-1">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(52,211,153,0.5)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-3 text-sm font-medium">
            <span className="text-slate-300">Terkumpul: <span className="text-white">{formatCurrency(totalTerkumpul)}</span></span>
            <span className="text-slate-300">Target: <span className="text-white">{formatCurrency(totalTarget)}</span></span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <a href="/admin/verifikasi" className="block p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">Verifikasi Setoran Sekarang</h3>
              <p className="text-sm text-slate-500 mt-1">Buka halaman verifikasi untuk menyetujui setoran jamaah.</p>
            </div>
          </div>
        </a>
        <a href="/admin/jamaah" className="block p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Kelola Data Jamaah</h3>
              <p className="text-sm text-slate-500 mt-1">Lihat daftar jamaah dan pilihan paket mereka.</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
