import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import InputSetoranForm from './InputSetoranForm';
import { Coins } from 'lucide-react';

export default async function InputSetoranPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  // Ambil semua daftar jamaah untuk dropdown
  const { data: jamaahList } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .order('full_name', { ascending: true });

  // Server action untuk menambah transaksi
  async function addAdminTransaction(formData: FormData) {
    'use server';
    
    const userId = formData.get('userId') as string;
    const rawAmount = Number(formData.get('amount'));
    const transactionType = formData.get('transactionType') as string;
    const amount = transactionType === 'penarikan' ? -rawAmount : rawAmount;
    const method = formData.get('method') as string;
    const proofUrl = formData.get('proofUrl') as string | null;

    if (!userId || !amount || !method) return { success: false, error: 'Incomplete data' };
    
    const supabaseAction = await createClient();
    const { data: { user } } = await supabaseAction.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    
    const { data: profileAction } = await supabaseAction.from('profiles').select('role').eq('id', user.id).single();
    if (profileAction?.role !== 'admin') return { success: false, error: 'Forbidden' };

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: newTx, error } = await adminClient.from('transactions').insert({
      user_id: userId,
      amount: amount,
      method: method,
      status: 'verified',
      proof_url: proofUrl || null
    }).select('id').single();

    if (error) return { success: false, error: error.message };

    const { data: jamaah } = await adminClient.from('profiles').select('full_name').eq('id', userId).single();
    const jamaahName = jamaah?.full_name || 'Jamaah';

    await adminClient.from('audit_logs').insert({
      admin_id: user.id,
      action: transactionType === 'penarikan' ? 'input penarikan' : 'input setoran',
      target_id: newTx?.id,
      details: `Admin menginput ${transactionType === 'penarikan' ? 'penarikan' : 'setoran manual'} sebesar Rp ${Math.abs(amount).toLocaleString('id-ID')} untuk jamaah: ${jamaahName}`
    });

    revalidatePath(`/admin/jamaah/${userId}`);
    revalidatePath('/admin/jamaah');
    return { success: true };
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Input Transaksi</h1>
          <p className="text-sm text-slate-500">Catat transaksi setoran atau penarikan dana jamaah secara manual.</p>
        </div>
      </div>

      <InputSetoranForm jamaahList={jamaahList || []} addTransaction={addAdminTransaction} />
    </div>
  );
}
