import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, User, Wallet, CheckCircle2, XCircle, Clock, Trash2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, calculateDaysLeft } from '@/lib/utils';
import InputTunaiForm from './InputTunaiForm';
import DeleteConfirmButton from '@/components/DeleteConfirmButton';
import ResetPasswordButton from './ResetPasswordButton';
import KategoriSelect from './KategoriSelect';
import ManualReminderButton from './ManualReminderButton';

export default async function JamaahDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const jamaahId = resolvedParams.id;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Validate admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  // Fetch jamaah profile
  const { data: jamaah } = await supabase
    .from('profiles')
    .select('*, user_packages(package_id, quantity, qurban_packages(name, price))')
    .eq('id', jamaahId)
    .single();

  if (!jamaah) notFound();

  // Fetch transactions
  const { data: transactionsRaw } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', jamaahId)
    .order('created_at', { ascending: false });

  const transactions = await Promise.all((transactionsRaw || []).map(async (tx) => {
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

  // Calculate stats
  let targetAmount = 0;
  if (jamaah.user_packages) {
    targetAmount = jamaah.user_packages.reduce((sum: number, item: any) => sum + ((Number(item.qurban_packages?.price) || 0) * (item.quantity || 1)), 0);
  }

  const verifiedTabungan = transactions?.filter(t => t.status === 'verified').reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const pendingTabungan = transactions?.filter(t => t.status === 'pending').reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const sisaTarget = Math.max(0, targetAmount - verifiedTabungan);
  const kelebihanTabungan = Math.max(0, verifiedTabungan - targetAmount);

  const { data: settings } = await supabase.from('program_settings').select('*').single();
  const daysLeft = settings ? calculateDaysLeft(settings.qurban_date) : 0;
  
  const totalDuration = 365;
  const elapsedDays = Math.max(0, totalDuration - daysLeft);
  const expectedProgress = (elapsedDays / totalDuration) * 100;
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((verifiedTabungan / targetAmount) * 100)) : 0;
  const isBehindTarget = progressPercent < (expectedProgress - 10) && sisaTarget > 0;

  const waMessage = `Assalamu'alaikum Bpk/Ibu ${jamaah.full_name},\n\nKami dari Panitia Tabungan Qurban ingin menginformasikan detail tabungan Anda:\n\n- Total Target: ${formatCurrency(targetAmount)}\n- Saldo Saat Ini: ${formatCurrency(verifiedTabungan)}\n- Sisa Tagihan: ${formatCurrency(sisaTarget)}\n\nTerima kasih atas partisipasinya!`;
  const waLink = jamaah.phone ? `https://wa.me/${jamaah.phone.replace(/^0/, '62')}?text=${encodeURIComponent(waMessage)}` : '#';

  async function resetPackage(formData: FormData) {
    'use server';
    const userId = formData.get('userId') as string;
    const packageId = formData.get('packageId') as string;
    const packageName = formData.get('packageName') as string || packageId;
    
    if (!userId || !packageId) return;
    
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await adminClient.from('user_packages').delete().eq('user_id', userId).eq('package_id', packageId);
    
    if (user) {
      await adminClient.from('audit_logs').insert({
        admin_id: user.id,
        action: 'hapus paket',
        target_id: userId,
        details: `Admin menghapus paket: ${packageName} atas nama ${jamaah.full_name}`
      });
    }

    revalidatePath(`/admin/jamaah/${userId}`);
  }

  async function addTransaction(amount: number) {
    'use server';
    
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    
    const { data: profile } = await supabaseAction.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, error: 'Forbidden' };

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminClient.from('transactions').insert({
      user_id: jamaahId,
      amount: amount,
      method: 'tunai',
      status: 'verified',
      proof_url: null
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/jamaah/${jamaahId}`);
    return { success: true };
  }

  async function deleteTransaction(formData: FormData) {
    'use server';
    const txId = formData.get('txId') as string;
    const txAmount = formData.get('txAmount') as string || txId;
    if (!txId) return;
    
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await adminClient.from('transactions').delete().eq('id', txId);
    
    if (user) {
      await adminClient.from('audit_logs').insert({
        admin_id: user.id,
        action: 'hapus transaksi',
        target_id: txId,
        details: `Admin menghapus transaksi: Rp ${txAmount} atas nama ${jamaah.full_name}`
      });
    }

    revalidatePath(`/admin/jamaah/${jamaahId}`);
  }

  async function forceResetPassword(formData: FormData) {
    'use server';
    const userId = formData.get('userId') as string;
    const newPassword = formData.get('newPassword') as string;
    if (!userId || !newPassword || newPassword.length < 6) return { success: false, error: 'Data tidak valid' };
    
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Check if acting user is admin
    const { data: profile } = await supabaseAction.from('profiles').select('role').eq('id', user?.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return { success: false, error: 'Akses ditolak' };
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (user) {
      await adminClient.from('audit_logs').insert({
        admin_id: user.id,
        action: 'reset password',
        target_id: userId,
        details: `Admin mereset password jamaah: ${jamaah.full_name}`
      });
    }

    return { success: true };
  }

  async function updateKategori(formData: FormData) {
    'use server';
    const kategori = formData.get('kategori') as string;
    console.log('updateKategori called with:', kategori, 'for jamaahId:', jamaahId);
    
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error } = await adminClient.from('profiles').update({ kategori_jamaah: kategori || null }).eq('id', jamaahId);
    if (error) {
      console.error('Error updating kategori:', error);
    } else {
      console.log('Update success');
    }
    revalidatePath(`/admin/jamaah/${jamaahId}`);
    revalidatePath(`/admin/jamaah`);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Link href="/admin/jamaah" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Detail Jamaah</h1>
          <p className="text-sm text-slate-500">Lihat profil, riwayat transaksi, dan catat setoran tunai.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Profil & Target */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">{jamaah.full_name}</h2>
                <p className="text-sm text-slate-500 mb-3">{jamaah.phone}</p>
                <div className="flex flex-wrap gap-2">
                  {jamaah.phone && (
                    <a 
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Pesan WA
                    </a>
                  )}
                  {jamaah.phone && isBehindTarget && (
                    <ManualReminderButton 
                      userId={jamaah.id} 
                      isOptIn={!!jamaah.wa_opt_in} 
                      phone={jamaah.phone_normalized || ''} 
                    />
                  )}
                  <ResetPasswordButton userId={jamaahId} resetAction={forceResetPassword} />
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b border-slate-50 gap-2">
                <span className="text-slate-500 shrink-0">Kategori Jamaah</span>
                <KategoriSelect defaultValue={jamaah.kategori_jamaah || ''} action={updateKategori} />
              </div>
              <div className="flex flex-col gap-1 py-2 border-b border-slate-50">
                <span className="text-slate-500">Alamat</span>
                <span className="font-medium text-slate-800">{jamaah.address || '-'}</span>
              </div>

              <div className="flex flex-col gap-2 py-2 border-b border-slate-50">
                <span className="text-slate-500">Paket Terpilih</span>
                <div className="flex flex-col gap-2 mt-1">
                  {jamaah.user_packages && jamaah.user_packages.length > 0 
                    ? jamaah.user_packages.map((up: any) => (
                        <div key={up.package_id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="font-medium text-emerald-600 text-sm">
                            {up.qurban_packages?.name} (x{up.quantity})
                          </span>
                          <form action={resetPackage}>
                            <input type="hidden" name="userId" value={jamaahId} />
                            <input type="hidden" name="packageId" value={up.package_id} />
                            <input type="hidden" name="packageName" value={`${up.qurban_packages?.name} (x${up.quantity})`} />
                            <DeleteConfirmButton 
                              title="Hapus Paket?" 
                              message="Apakah Anda yakin ingin menghapus paket ini dari jamaah? Target akan disesuaikan otomatis." 
                            />
                          </form>
                        </div>
                      ))
                    : <span className="text-slate-400 italic text-sm">Belum memilih paket</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" /> Ringkasan Dana
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Terverifikasi</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(verifiedTabungan)}</p>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                <span className="text-sm font-medium text-amber-800">Menunggu Verifikasi</span>
                <span className="text-sm font-bold text-amber-700">{formatCurrency(pendingTabungan)}</span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-lg ${kelebihanTabungan > 0 ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                <span className={`text-sm font-medium ${kelebihanTabungan > 0 ? 'text-emerald-800' : 'text-blue-800'}`}>
                  {kelebihanTabungan > 0 ? 'Kelebihan Dana' : 'Sisa Target'}
                </span>
                <span className={`text-sm font-bold ${kelebihanTabungan > 0 ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {formatCurrency(kelebihanTabungan > 0 ? kelebihanTabungan : sisaTarget)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Riwayat Transaksi */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Riwayat Transaksi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Metode</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions && transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="capitalize font-medium">{tx.method}</span>
                            {tx.method === 'transfer' && tx.proof_url && (
                              <a href={tx.proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline mt-0.5">
                                Lihat Bukti
                              </a>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 font-bold ${tx.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {formatCurrency(tx.amount)}
                          {tx.amount < 0 && <div className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium mt-1 w-fit">Penarikan</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                            ${tx.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 
                              tx.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                              'bg-amber-100 text-amber-700'}`}
                          >
                            {tx.status === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : 
                             tx.status === 'rejected' ? <XCircle className="w-3 h-3" /> : 
                             <Clock className="w-3 h-3" />}
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <form action={deleteTransaction}>
                            <input type="hidden" name="txId" value={tx.id} />
                            <input type="hidden" name="txAmount" value={tx.amount.toLocaleString('id-ID')} />
                            <DeleteConfirmButton 
                              title="Hapus Transaksi?" 
                              message="Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan." 
                            />
                          </form>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        Belum ada transaksi dari jamaah ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
