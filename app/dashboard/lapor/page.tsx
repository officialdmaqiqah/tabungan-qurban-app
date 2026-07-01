'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, CheckCircle2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { notifyAdminOnDepositReported } from '@/app/actions/transaction_whatsapp';

export default function LaporSetoranPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);
  
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('transfer');
  const [file, setFile] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Fetch bank accounts
  useEffect(() => {
    async function fetchBankAccounts() {
      const { data } = await supabase.from('bank_accounts').select('*').eq('is_active', true);
      if (data) {
        setBankAccounts(data);
      }
    }
    fetchBankAccounts();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Anda harus login.");

      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error("Jumlah setoran tidak valid.");
      }

      let proofUrl = null;

      // Handle file upload if method is transfer
      if (method === 'transfer') {
        if (!file) throw new Error("Bukti transfer wajib diunggah.");

        // Validasi ukuran dan format file
        if (file.size > 2 * 1024 * 1024) {
          throw new Error("Ukuran file maksimal 2MB. Mohon kompres foto terlebih dahulu.");
        }
        
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          throw new Error("Format file harus JPG, PNG, atau PDF.");
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('proofs')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Store the file path instead of public URL
        proofUrl = 'proofs/' + uploadData.path;
      }

      // Insert transaction
      const { data: newTx, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: numericAmount,
          method: method,
          proof_url: proofUrl,
          status: 'pending'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Trigger WA Notification as background task (don't await to avoid blocking)
      if (newTx?.id) {
        notifyAdminOnDepositReported(newTx.id).catch(e => console.error(e));
      }

      setSuccess(true);
      setAmount('');
      setFile(null);
      
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat melaporkan setoran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else {
        router.push('/dashboard');
      }
    }
    return () => clearTimeout(timer);
  }, [success, countdown, router]);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Laporan Berhasil Diterima</h2>
        <p className="text-slate-600 max-w-md mx-auto mb-4">
          Setoran Anda berstatus <strong>Pending</strong> dan akan dicek oleh admin. 
          Saldo Anda akan bertambah setelah setoran divalidasi.
        </p>
        <p className="text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
          Mengarahkan kembali ke ringkasan dalam {countdown} detik...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Lapor Setoran</h1>
        <p className="text-sm text-slate-500 mt-1">Laporkan setoran yang telah Anda lakukan ke rekening resmi atau tunai ke panitia.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah Setoran (Rp)</label>
          <input 
            type="number"
            required
            min="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg font-medium"
            placeholder="Contoh: 500000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Metode Setoran</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMethod('transfer')}
              className={`p-4 border rounded-xl flex items-center justify-center font-medium transition-all ${
                method === 'transfer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Transfer Bank
            </button>
            <button
              type="button"
              onClick={() => setMethod('tunai')}
              className={`p-4 border rounded-xl flex items-center justify-center font-medium transition-all ${
                method === 'tunai' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tunai ke Panitia
            </button>
          </div>
        </div>

        {method === 'transfer' && (
          <div className="space-y-4">
            {bankAccounts.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <div className="mt-0.5 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-2">Transfer ke Rekening Resmi:</p>
                  <div className="space-y-2">
                    {bankAccounts.map((bank, i) => (
                      <div key={i} className="bg-white px-3 py-2 rounded-lg border border-blue-200">
                        <p className="font-bold text-slate-900">{bank.bank_name} - {bank.account_number}</p>
                        <p className="text-xs text-slate-500">a.n. {bank.account_name}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Pastikan nominal transfer sesuai dengan yang Anda laporkan di atas.</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bukti Transfer</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:bg-slate-50 transition-colors">
              <div className="space-y-2 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none">
                    <span>Pilih file gambar</span>
                    <input 
                      id="file-upload" 
                      name="file-upload" 
                      type="file" 
                      accept="image/jpeg,image/png,application/pdf"
                      className="sr-only" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">JPG, PNG, atau PDF maks 2MB</p>
                {file && (
                  <p className="text-sm font-medium text-emerald-600 mt-2 truncate max-w-xs">{file.name}</p>
                )}
              </div>
            </div>
          </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-lg"
        >
          {loading ? 'Mengirim...' : 'Kirim Laporan'}
        </button>
      </form>
    </div>
  );
}
