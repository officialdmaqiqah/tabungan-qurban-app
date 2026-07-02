import { createClient } from '@/lib/supabase/server';
import { formatCurrency, calculateDaysLeft, maskName } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { Target, TrendingUp, Calendar, AlertCircle, EyeOff, Eye, Trophy, Sparkles } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Run all independent queries concurrently to eliminate waterfalls
  const [
    { data: userProfile },
    { data: userPackages },
    { data: verifiedTransactions },
    { data: settings },
    { data: historyRaw },
    { data: allProfiles },
    { data: allPackages },
    { data: allTransactions }
  ] = await Promise.all([
    supabase.from('profiles').select('kategori_jamaah, is_anonymous').eq('id', user.id).single(),
    supabase.from('user_packages').select('package_id, quantity, qurban_packages(name, price)').eq('user_id', user.id),
    supabase.from('transactions').select('amount').eq('user_id', user.id).eq('status', 'verified'),
    supabase.from('program_settings').select('*').single(),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, is_anonymous').eq('role', 'jamaah'),
    supabase.from('user_packages').select('user_id, quantity, qurban_packages(price)'),
    supabase.from('transactions').select('user_id, amount').eq('status', 'verified')
  ]);

  let targetAmount = 0;
  if (userPackages) {
    targetAmount = userPackages.reduce((sum, item: any) => sum + ((Number(item.qurban_packages?.price) || 0) * (item.quantity || 1)), 0);
  }

  const totalTabungan = verifiedTransactions?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  
  // Calculate Progress
  const sisaTarget = Math.max(0, targetAmount - totalTabungan);
  const kelebihanTabungan = Math.max(0, totalTabungan - targetAmount);
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((totalTabungan / targetAmount) * 100)) : 0;

  const daysLeft = settings ? calculateDaysLeft(settings.qurban_date) : 0;

  // Calculate Recommendations
  const recPerDay = daysLeft > 0 ? sisaTarget / daysLeft : 0;
  const recPerWeek = daysLeft > 0 ? sisaTarget / (daysLeft / 7) : 0;
  const recPerMonth = daysLeft > 0 ? sisaTarget / (daysLeft / 30) : 0;

  const history = await Promise.all((historyRaw || []).map(async (tx) => {
    let finalUrl = tx.proof_url;
    if (finalUrl && !finalUrl.startsWith('http')) {
      const parts = finalUrl.split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');
      if (bucket && path) {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (data) finalUrl = data.signedUrl;
      }
    }
    return { ...tx, proof_url: finalUrl };
  }));

  // Leaderboard & Motivation Logic

  const leaderboardRaw = allProfiles?.map(prof => {
    const profPackages = allPackages?.filter(p => p.user_id === prof.id) || [];
    const profTarget = profPackages.reduce((sum, item: any) => sum + ((Number(item.qurban_packages?.price) || 0) * (item.quantity || 1)), 0);
    const profTx = allTransactions?.filter(t => t.user_id === prof.id) || [];
    const profTotal = profTx.reduce((sum, item) => sum + Number(item.amount), 0);
    const profProgress = profTarget > 0 ? Math.min(100, Math.round((profTotal / profTarget) * 100)) : 0;
    
    let displayName = prof.full_name || 'Hamba Allah';
    if (prof.id === user.id) {
      displayName = '(Anda)';
    } else if (prof.is_anonymous) {
      displayName = 'Hamba Allah';
    } else {
      displayName = maskName(displayName);
    }

    return { id: prof.id, name: displayName, progress: profProgress, isCurrentUser: prof.id === user.id };
  }).filter(l => l.progress > 0) || [];

  const leaderboard = leaderboardRaw.sort((a, b) => b.progress - a.progress).slice(0, 5);

  const quotes = [
    "Barangsiapa yang berkurban, maka setiap helai bulu kurbannya adalah kebaikan. - (HR. Ahmad)",
    "Kurban adalah kendaraanmu melewati shirat, maka gemukkanlah kurbanmu.",
    "Tidak ada amalan anak Adam yang lebih dicintai Allah pada hari Nahr selain mengalirkan darah (berkurban). - (HR. Tirmidzi)",
    "Sedikit demi sedikit, insyaAllah niat suci berkurban akan terwujud. Semangat menabung!",
    "Sisihkan, bukan sisakan. Tabungan qurban adalah bukti kesungguhan cinta kepada-Nya.",
    "Setiap rupiah yang ditabung untuk qurban, akan menjadi saksi pengorbanan di hari kelak."
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  // Tertinggal Target Logic
  const totalDuration = 365;
  const elapsedDays = Math.max(0, totalDuration - daysLeft);
  const expectedProgress = (elapsedDays / totalDuration) * 100;
  const isBehindTarget = progressPercent < (expectedProgress - 10) && sisaTarget > 0;

  async function togglePrivacy(formData: FormData) {
    'use server';
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();
    if (!user) return;
    
    const currentStatus = formData.get('currentStatus') === 'true';
    await supabaseAction.from('profiles').update({ is_anonymous: !currentStatus }).eq('id', user.id);
    revalidatePath('/dashboard');
    revalidatePath('/transparansi');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Ringkasan Tabungan</h1>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-1 justify-end">
              {userProfile?.is_anonymous ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
              Mode Privasi
            </span>
            <span className="text-[10px] text-slate-500">Sembunyikan nama di publik</span>
          </div>
          <form action={togglePrivacy}>
            <input type="hidden" name="currentStatus" value={String(userProfile?.is_anonymous)} />
            <button 
              type="submit"
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${userProfile?.is_anonymous ? 'bg-emerald-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${userProfile?.is_anonymous ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </form>
        </div>
      </div>

      {targetAmount === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Anda belum memilih paket Qurban!</p>
            <p className="text-sm mt-1">Silakan hubungi Admin untuk memilih paket Qurban agar target tabungan Anda muncul di sini.</p>
          </div>
        </div>
      )}

      {targetAmount > 0 && isBehindTarget && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Perhatian: Progres Tabungan Agak Tertinggal</p>
            <p className="text-sm mt-1">Berdasarkan sisa waktu menuju Idul Adha, tabungan Anda saat ini sedikit di bawah target ideal. Yuk, tambah setoran agar target Anda tercapai tepat waktu!</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Tabungan (Premium Card) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-6 rounded-3xl shadow-lg border border-emerald-700 text-white flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-overlay filter blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500 rounded-full mix-blend-overlay filter blur-3xl opacity-40"></div>
          
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
              <TrendingUp className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/10">Saldo Aktif</span>
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100 font-medium text-sm mb-1">Total Tabungan</p>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalTabungan)}</p>
          </div>
        </div>

        {/* Sisa Target Card */}
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">{kelebihanTabungan > 0 ? 'Kelebihan Dana' : 'Sisa Target'}</p>
            <p className={`text-2xl font-bold tracking-tight ${kelebihanTabungan > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(kelebihanTabungan > 0 ? kelebihanTabungan : sisaTarget)}</p>
          </div>
        </div>

        {/* Sisa Hari Card */}
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Sisa Waktu</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{daysLeft > 0 ? `${daysLeft} Hari Lagi` : 'Hari H'}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Progress Qurban Anda</h3>
            <p className="text-sm text-slate-500 mt-1">Perjalanan menuju niat suci</p>
          </div>
          <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-sm border border-emerald-100">
            {progressPercent}% Tercapai
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden shadow-inner relative">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
            style={{ width: `${progressPercent}%` }}
          >
             {progressPercent > 15 && <Sparkles className="w-3 h-3 text-white/50" />}
          </div>
        </div>
        
        {/* Pesan Motivasi Inline */}
        {targetAmount > 0 && (
          <div className="mt-5 text-sm italic font-medium text-slate-600 border-l-4 border-amber-400 pl-4 bg-amber-50/50 py-3 rounded-r-xl">
            "{randomQuote}"
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 pt-5 border-t border-slate-100 gap-2">
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
              <Target className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Paket Pilihan</span>
              <span className="font-medium text-slate-700">
                {userPackages && userPackages.length > 0 
                  ? userPackages.map((up: any) => `${up.qurban_packages?.name} (x${up.quantity})`).join(', ')
                  : '-'}
              </span>
            </div>
          </div>
          <div className="text-right">
             <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Target Dana</span>
             <span className="text-lg font-bold text-slate-900">{formatCurrency(targetAmount)}</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {sisaTarget > 0 && daysLeft > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-500">
              💡
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Rekomendasi Setoran</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 hover:border-emerald-200 transition-colors group">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Per Hari</p>
              <p className="font-bold text-2xl text-emerald-700 group-hover:text-emerald-600 transition-colors">{formatCurrency(recPerDay)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 hover:border-emerald-200 transition-colors group">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Per Minggu</p>
              <p className="font-bold text-2xl text-emerald-700 group-hover:text-emerald-600 transition-colors">{formatCurrency(recPerWeek)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 hover:border-emerald-200 transition-colors group">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Per Bulan</p>
              <p className="font-bold text-2xl text-emerald-700 group-hover:text-emerald-600 transition-colors">{formatCurrency(recPerMonth)}</p>
            </div>
          </div>
        </div>
      )}



      {/* Transaction History */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">Riwayat Setoran</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Metode</th>
                <th className="px-6 py-4">Jumlah</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {history && history.length > 0 ? (
                history.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 last:border-0 hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4 text-slate-500">{new Date(tx.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="capitalize font-medium text-slate-700">{tx.method}</span>
                        {tx.method === 'transfer' && tx.proof_url && (
                          <a href={tx.proof_url} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline mt-0.5">
                            Lihat Bukti
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{formatCurrency(tx.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase
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
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-slate-300" />
                      </div>
                      <p>Belum ada riwayat transaksi.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Leaderboard */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-6 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" /> Leaderboard Qurban
            </h3>
            <p className="text-sm text-slate-500 mt-1">Semangat menabung jamaah lainnya</p>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">Top 5</span>
        </div>
        
        {leaderboard.length > 0 ? (
          <div className="relative z-10 space-y-3">
            {leaderboard.map((l, idx) => (
              <div key={l.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${l.isCurrentUser ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-emerald-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-white' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-white' : idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                    {idx === 0 ? '👑' : idx + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm ${l.isCurrentUser ? 'text-emerald-800' : 'text-slate-700'}`}>{l.name}</span>
                    {l.isCurrentUser && <span className="text-[10px] text-emerald-600 font-medium">Ini Anda</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block shadow-inner">
                    <div className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} style={{ width: `${l.progress}%` }}></div>
                  </div>
                  <span className={`text-sm font-bold w-10 text-right ${idx === 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{l.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="relative z-10 text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-2xl">Belum ada data jamaah yang menabung.</p>
        )}
      </div>
    </div>
  );
}
