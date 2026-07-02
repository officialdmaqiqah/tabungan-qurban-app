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

      {/* UNIFIED MASTER CARD */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 rounded-[2.5rem] shadow-2xl border border-emerald-800 text-white">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500 rounded-full mix-blend-overlay filter blur-3xl opacity-30 translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
        
        <div className="relative z-10 p-6 sm:p-8 md:p-10">
          {/* Header & Balance */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                  <TrendingUp className="w-6 h-6 text-emerald-300" />
                </div>
                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold border border-white/10 tracking-widest uppercase shadow-sm">Saldo Aktif</span>
              </div>
              <p className="text-emerald-100/70 text-sm font-medium mb-1 uppercase tracking-wider">Total Tabungan</p>
              <p className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">{formatCurrency(totalTabungan)}</p>
              
              {userPackages && userPackages.length > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full">
                  <Target className="w-4 h-4 text-emerald-300" /> 
                  <span className="text-xs font-medium text-emerald-50">
                    {userPackages.map((up: any) => `${up.qurban_packages?.name} (x${up.quantity})`).join(', ')}
                  </span>
                </div>
              )}
            </div>
            
            {/* Motivasi */}
            {targetAmount > 0 && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 max-w-xs shadow-inner hidden sm:block">
                <div className="flex gap-3">
                  <span className="text-xl">💡</span>
                  <p className="text-sm text-emerald-50 font-medium italic leading-relaxed">"{randomQuote}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Integrated Progress */}
          <div className="mb-8 md:mb-10">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-semibold text-emerald-100/90 tracking-wide">Progress Qurban</span>
              <span className="text-2xl font-bold text-white flex items-center gap-1">
                {progressPercent}% <Sparkles className="w-4 h-4 text-amber-300" />
              </span>
            </div>
            <div className="w-full bg-black/30 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-white/10 shadow-inner p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                style={{ width: `${progressPercent}%` }}
              >
              </div>
            </div>
          </div>

          {/* Three Pillars (Target, Sisa, Waktu) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 pt-6 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
              <p className="text-[9px] sm:text-[11px] text-emerald-200/80 uppercase tracking-widest font-bold mb-1 sm:mb-2">Target Dana</p>
              <p className="text-sm sm:text-lg md:text-xl font-bold truncate">{formatCurrency(targetAmount)}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
              <p className="text-[9px] sm:text-[11px] text-emerald-200/80 uppercase tracking-widest font-bold mb-1 sm:mb-2">{kelebihanTabungan > 0 ? 'Kelebihan' : 'Kekurangan'}</p>
              <p className={`text-sm sm:text-lg md:text-xl font-bold truncate ${kelebihanTabungan > 0 ? 'text-teal-300' : ''}`}>{formatCurrency(kelebihanTabungan > 0 ? kelebihanTabungan : sisaTarget)}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
              <p className="text-[9px] sm:text-[11px] text-emerald-200/80 uppercase tracking-widest font-bold mb-1 sm:mb-2">Sisa Waktu</p>
              <p className="text-sm sm:text-lg md:text-xl font-bold truncate flex items-center gap-1.5">
                <Calendar className="w-4 h-4 hidden sm:block text-emerald-300" />
                {daysLeft > 0 ? `${daysLeft} Hari` : 'Hari H'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {sisaTarget > 0 && daysLeft > 0 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
           <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              💡
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Rekomendasi Setoran</h3>
              <p className="text-xs text-slate-500">Pilih ritme menabung yang pas untuk Anda</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <div className="bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100 flex flex-col items-center justify-center text-center group hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-default">
                <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mb-2 group-hover:text-emerald-700 transition-colors">Harian</span>
                <span className="text-sm sm:text-lg md:text-2xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{formatCurrency(recPerDay)}</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100 flex flex-col items-center justify-center text-center group hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-default">
                <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mb-2 group-hover:text-emerald-700 transition-colors">Mingguan</span>
                <span className="text-sm sm:text-lg md:text-2xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{formatCurrency(recPerWeek)}</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100 flex flex-col items-center justify-center text-center group hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-default">
                <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mb-2 group-hover:text-emerald-700 transition-colors">Bulanan</span>
                <span className="text-sm sm:text-lg md:text-2xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{formatCurrency(recPerMonth)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout Start for Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: History */}
        <div className="lg:col-span-7 xl:col-span-8">
          {/* Transaction History */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden h-full">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Riwayat Setoran</h3>
                <p className="text-xs text-slate-500 mt-1">Daftar transaksi tabungan Anda</p>
              </div>
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
        </div>

        {/* RIGHT COLUMN: Leaderboard */}
        <div className="lg:col-span-5 xl:col-span-4">
          {/* Leaderboard */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10 flex flex-col mb-6">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" /> Leaderboard Qurban
              </h3>
              <div className="flex justify-between items-center mt-1">
                 <p className="text-xs text-slate-500">Semangat menabung jamaah</p>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">Top 5</span>
              </div>
            </div>
            
            {leaderboard.length > 0 ? (
              <div className="relative z-10 space-y-3">
                {leaderboard.map((l, idx) => (
                  <div key={l.id} className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 hover:shadow-md ${l.isCurrentUser ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-emerald-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-white' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-white' : idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                          {idx === 0 ? '👑' : idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${l.isCurrentUser ? 'text-emerald-800' : 'text-slate-700'}`}>{l.name}</span>
                          {l.isCurrentUser && <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Ini Anda</span>}
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${idx === 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{l.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} style={{ width: `${l.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="relative z-10 text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">Belum ada data jamaah yang menabung.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
