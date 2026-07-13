import { formatCurrency, maskName } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Search, Users, Wallet, Sparkles } from 'lucide-react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function TransparansiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = await searchParams;
  const query = (resolvedParams.q || '').toLowerCase();
  
  // Use service_role key to bypass RLS for public transparency page
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all jamaah profiles
  const { data: jamaahList } = await supabase
    .from('profiles')
    .select('id, full_name, is_anonymous')
    .eq('role', 'jamaah');

  // Fetch all verified transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('user_id, amount')
    .eq('status', 'verified');

  // Fetch all user packages
  const { data: userPackages } = await supabase
    .from('user_packages')
    .select('user_id, package_id, quantity, qurban_packages(price)');

  // Aggregate data
  const aggregatedData = jamaahList?.map(jamaah => {
    let publicName = jamaah.full_name || 'Hamba Allah';
    
    if (jamaah.is_anonymous) {
      publicName = publicName.split(' ').map((word: string) => maskName(word)).join(' ');
    }

    // Calculate total tabungan
    const totalTabungan = transactions
      ?.filter(t => t.user_id === jamaah.id)
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Calculate target
    const target = userPackages
      ?.filter(up => up.user_id === jamaah.id)
      .reduce((sum, up: any) => sum + ((Number(up.qurban_packages?.price) || 0) * (up.quantity || 1)), 0) || 0;

    const progress = target > 0 ? Math.min(100, Math.round((totalTabungan / target) * 100)) : 0;
    
    // Status
    let statusText = 'Belum Ada Target';
    if (target > 0) {
      if (totalTabungan >= target) statusText = 'Lunas';
      else if (totalTabungan > 0) statusText = 'Proses Menabung';
      else statusText = 'Belum Ada Setoran';
    }

    return {
      id: jamaah.id,
      publicName,
      originalName: jamaah.full_name || '',
      totalTabungan,
      target,
      progress,
      statusText
    };
  })?.filter(data => 
    !query || 
    data.originalName.toLowerCase().includes(query) || 
    data.publicName.toLowerCase().includes(query)
  ) || [];

  // Sort alphabetically by original name
  aggregatedData.sort((a, b) => a.originalName.localeCompare(b.originalName));

  // Calculate overall statistics
  const totalVerifiedFunds = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalJamaahRegistered = jamaahList?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      <header className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white pt-10 pb-16 px-4 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-80 h-80 bg-emerald-500 rounded-full blur-[100px] opacity-35"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-80 h-80 bg-teal-500 rounded-full blur-[100px] opacity-35"></div>

        <div className="container mx-auto max-w-5xl relative z-10">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/50 border border-emerald-700/50 text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Masjid Agung Kubah Timah
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight">Transparansi Tabungan</h1>
              <p className="text-emerald-100/80 text-sm sm:text-base max-w-2xl">
                Laporan terbuka perkembangan tabungan qurban jamaah. Nama sebagian jamaah disamarkan secara otomatis untuk menjaga privasi & kenyamanan beribadah.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-12 -mt-8 relative z-20">
        
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-100/50 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block uppercase tracking-wider">Total Dana Terkumpul</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{formatCurrency(totalVerifiedFunds)}</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-100/50 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block uppercase tracking-wider">Total Jamaah Terdaftar</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalJamaahRegistered} Orang</span>
            </div>
          </div>
        </div>

        {/* Search & Table Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
          
          {/* Search Filter Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <form action="/transparansi" method="GET" className="relative max-w-md">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                name="q"
                defaultValue={query}
                placeholder="Cari nama jamaah..." 
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white transition-all shadow-sm"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4.5 font-bold">Nama Jamaah</th>
                  <th className="px-6 py-4.5 font-bold">Target</th>
                  <th className="px-6 py-4.5 font-bold">Terkumpul</th>
                  <th className="px-6 py-4.5 font-bold w-1/3">Progres Tabungan</th>
                  <th className="px-6 py-4.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aggregatedData.map((data) => (
                  <tr key={data.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{data.publicName}</td>
                    <td className="px-6 py-4 font-medium text-slate-500">{data.target > 0 ? formatCurrency(data.target) : '-'}</td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600">{formatCurrency(data.totalTabungan)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              data.progress >= 100 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                            }`}
                            style={{ width: `${data.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-black text-slate-700 w-10 text-right">{data.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border
                        ${data.progress >= 100 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : data.totalTabungan > 0 
                            ? 'bg-amber-50 border-amber-200 text-amber-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {data.statusText}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {aggregatedData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Search className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="font-medium text-slate-500">Tidak menemukan hasil untuk pencarian Anda</p>
                        <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci nama lain.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
