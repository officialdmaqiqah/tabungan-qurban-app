import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { Check, X, ShieldAlert, Filter } from 'lucide-react';
import { notifyJamaahOnDepositApproved, notifyJamaahOnDepositRejected } from '@/app/actions/transaction_whatsapp';
import RejectButton from './RejectButton';

export default async function AdminVerifikasiPage({ searchParams }: { searchParams: Promise<{ status?: string, method?: string }> }) {
  const resolvedParams = await searchParams;
  const filterStatus = resolvedParams.status || 'pending';
  const filterMethod = resolvedParams.method || 'all';

  const supabase = await createClient();

  // Fetch pending transactions with user profile
  let query = supabase
    .from('transactions')
    .select('*, profiles!transactions_user_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false });

  if (filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }
  
  if (filterMethod !== 'all') {
    query = query.eq('method', filterMethod);
  }

  const { data: pendingTxsRaw } = await query;

  const pendingTxs = await Promise.all((pendingTxsRaw || []).map(async (tx) => {
    let finalUrl = tx.proof_url;
    if (finalUrl && !finalUrl.startsWith('http')) {
      const parts = finalUrl.split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');
      if (bucket && path) {
        // Use service role client if admin needs to bypass RLS to read proofs (or assume admin has RLS permission)
        // Here we just use the default supabase client which assumes RLS allows admin to read
        const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (data) finalUrl = data.signedUrl;
      }
    }
    return { ...tx, proof_url: finalUrl };
  }));

  // Server Actions for Approve/Reject
  async function approveTransaction(formData: FormData) {
    'use server';
    const txId = formData.get('txId') as string;
    const txAmount = formData.get('txAmount') as string || txId;
    const txName = formData.get('txName') as string || '';
    
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();
    
    await supabaseAction
      .from('transactions')
      .update({ 
        status: 'verified', 
        verified_at: new Date().toISOString(),
        verified_by: user?.id
      })
      .eq('id', txId);
      
    await supabaseAction.from('audit_logs').insert({
      admin_id: user?.id,
      action: 'verifikasi setoran',
      target_id: txId,
      details: `Memverifikasi setoran Rp ${txAmount} atas nama ${txName}`
    });

    notifyJamaahOnDepositApproved(txId).catch(e => console.error(e));
      
    revalidatePath('/admin/verifikasi');
  }

  async function rejectTransaction(formData: FormData) {
    'use server';
    const txId = formData.get('txId') as string;
    const txAmount = formData.get('txAmount') as string || txId;
    const txName = formData.get('txName') as string || '';
    const adminNote = formData.get('adminNote') as string || '';
    
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();
    
    await supabaseAction
      .from('transactions')
      .update({ 
        status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: user?.id
      })
      .eq('id', txId);
      
    await supabaseAction.from('audit_logs').insert({
      admin_id: user?.id,
      action: 'tolak setoran',
      target_id: txId,
      details: `Menolak setoran Rp ${txAmount} atas nama ${txName}`
    });

    notifyJamaahOnDepositRejected(txId, adminNote).catch(e => console.error(e));
      
    revalidatePath('/admin/verifikasi');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Data Transaksi</h1>
            <p className="text-slate-500 mt-1 text-sm">Kelola dan verifikasi setoran masuk dari jamaah.</p>
          </div>
        </div>

        <form method="GET" className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select name="status" defaultValue={filterStatus} className="text-sm bg-transparent border-none focus:ring-0 text-slate-700 cursor-pointer">
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Verifikasi</option>
            <option value="verified">Terverifikasi</option>
            <option value="rejected">Ditolak</option>
          </select>
          <div className="hidden sm:block w-px h-4 bg-slate-300 mx-1"></div>
          <select name="method" defaultValue={filterMethod} className="text-sm bg-transparent border-none focus:ring-0 text-slate-700 cursor-pointer">
            <option value="all">Semua Metode</option>
            <option value="tunai">Tunai</option>
            <option value="transfer">Transfer</option>
          </select>
          <button type="submit" className="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Filter
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Tanggal</th>
                <th className="px-6 py-4 font-semibold">Jamaah</th>
                <th className="px-6 py-4 font-semibold">Jumlah</th>
                <th className="px-6 py-4 font-semibold">Metode / Bukti</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingTxs && pendingTxs.length > 0 ? (
                pendingTxs.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{tx.profiles?.full_name}</div>
                      <div className="text-xs text-slate-500">{tx.profiles?.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(tx.amount)}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize block mb-1 font-medium">{tx.method}</span>
                      {tx.proof_url && (
                        <a href={tx.proof_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
                          Lihat Bukti
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {tx.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <form action={approveTransaction}>
                            <input type="hidden" name="txId" value={tx.id} />
                            <input type="hidden" name="txAmount" value={tx.amount.toLocaleString('id-ID')} />
                            <input type="hidden" name="txName" value={tx.profiles?.full_name} />
                            <button type="submit" className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-colors" title="Setujui">
                              <Check className="w-4 h-4" />
                            </button>
                          </form>
                          <RejectButton 
                            txId={tx.id} 
                            txAmount={tx.amount.toLocaleString('id-ID')}
                            txName={tx.profiles?.full_name}
                            action={rejectTransaction} 
                          />
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tx.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {tx.status}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ShieldAlert className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="font-medium text-slate-500">Semua setoran sudah terverifikasi.</p>
                      <p className="text-xs mt-1">Tidak ada transaksi tertunda saat ini.</p>
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
