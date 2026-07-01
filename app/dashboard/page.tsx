import { createClient } from '@/lib/supabase/server';
import { formatCurrency, calculateDaysLeft, getProgressBadge, maskName } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { Target, TrendingUp, Calendar, AlertCircle, EyeOff, Eye, Trophy } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: userProfile } = await supabase.from('profiles').select('kategori_jamaah, is_anonymous').eq('id', user.id).single();

  // Fetch target (user_packages)
  const { data: userPackages } = await supabase
    .from('user_packages')
    .select('package_id, quantity, qurban_packages(name, price)')
    .eq('user_id', user.id);

  let targetAmount = 0;
  if (userPackages) {
    targetAmount = userPackages.reduce((sum, item: any) => sum + ((Number(item.qurban_packages?.price) || 0) * (item.quantity || 1)), 0);
  }

  // Fetch verified transactions (Total tabungan)
  const { data: verifiedTransactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('status', 'verified');

  const totalTabungan = verifiedTransactions?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  
  // Calculate Progress
  const sisaTarget = Math.max(0, targetAmount - totalTabungan);
  const kelebihanTabungan = Math.max(0, totalTabungan - targetAmount);
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((totalTabungan / targetAmount) * 100)) : 0;

  // Fetch program settings for Qurban date
  const { data: settings } = await supabase
    .from('program_settings')
    .select('*')
    .single();

  const daysLeft = settings ? calculateDaysLeft(settings.qurban_date) : 0;

  // Calculate Recommendations
  const recPerDay = daysLeft > 0 ? sisaTarget / daysLeft : 0;
  const recPerWeek = daysLeft > 0 ? sisaTarget / (daysLeft / 7) : 0;
  const recPerMonth = daysLeft > 0 ? sisaTarget / (daysLeft / 30) : 0;

  // Fetch transaction history
  const { data: historyRaw } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

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
  const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, is_anonymous').eq('role', 'jamaah');
  const { data: allPackages } = await supabase.from('user_packages').select('user_id, quantity, qurban_packages(price)');
  const { data: allTransactions } = await supabase.from('transactions').select('user_id, amount').eq('status', 'verified');

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
  const badge = getProgressBadge(progressPercent);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Tabungan</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalTabungan)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">{kelebihanTabungan > 0 ? 'Kelebihan Dana' : 'Sisa Target'}</p>
            <p className={`text-2xl font-bold ${kelebihanTabungan > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(kelebihanTabungan > 0 ? kelebihanTabungan : sisaTarget)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Sisa Hari</p>
            <p className="text-2xl font-bold text-slate-900">{daysLeft > 0 ? `${daysLeft} Hari` : 'Hari H'}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Progress Tabungan</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <span className="text-sm font-medium text-emerald-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        
        {/* Pesan Motivasi Inline */}
        {targetAmount > 0 && (
          <div className="mt-3 text-sm italic font-medium text-slate-600 border-l-2 border-emerald-500 pl-3">
            "{randomQuote}"
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-slate-100 gap-2">
          <div className="text-sm text-slate-600">
            <div>
              <strong>Paket Anda:</strong>{' '}
              {userPackages && userPackages.length > 0 
                ? userPackages.map((up: any) => `${up.qurban_packages?.name} (x${up.quantity})`).join(', ')
                : '-'}
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-800">Target: {formatCurrency(targetAmount)}</p>
        </div>
      </div>

      {/* Recommendations */}
      {sisaTarget > 0 && daysLeft > 0 && (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md">
          <h3 className="font-semibold text-lg mb-4">💡 Rekomendasi Tabungan Anda</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-emerald-100 text-sm">Per Hari</p>
              <p className="font-bold text-xl">{formatCurrency(recPerDay)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-emerald-100 text-sm">Per Minggu</p>
              <p className="font-bold text-xl">{formatCurrency(recPerWeek)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-emerald-100 text-sm">Per Bulan</p>
              <p className="font-bold text-xl">{formatCurrency(recPerMonth)}</p>
            </div>
          </div>
        </div>
      )}



      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Riwayat Setoran</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Metode</th>
                <th className="px-6 py-3">Jumlah</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history && history.length > 0 ? (
                history.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-4">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="capitalize">{tx.method}</span>
                        {tx.method === 'transfer' && tx.proof_url && (
                          <a href={tx.proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline mt-0.5">
                            Lihat Bukti
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(tx.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium
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
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Leaderboard */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Leaderboard Semangat Qurban
          </h3>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Top 5 Jamaah</span>
        </div>
        
        {leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((l, idx) => (
              <div key={l.id} className={`flex items-center justify-between p-3 rounded-xl border ${l.isCurrentUser ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <span className={`font-medium text-sm ${l.isCurrentUser ? 'text-emerald-700' : 'text-slate-700'}`}>{l.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${l.progress}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 w-9 text-right">{l.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">Belum ada data jamaah yang menabung.</p>
        )}
      </div>
    </div>
  );
}
