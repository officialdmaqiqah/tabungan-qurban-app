'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';
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
    <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
      <div className="lg:col-span-8 space-y-5 md:space-y-6">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Lapor Setoran</h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl">Laporkan setoran yang telah Anda lakukan ke rekening resmi atau serahkan tunai ke panitia masjid.</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start gap-2.5">
            <div className="flex-1 text-sm font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-5 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
          <div>
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2.5">Jumlah Setoran (Rp)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">Rp</span>
              <input 
                type="number"
                required
                min="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-lg font-bold text-slate-800"
                placeholder="500000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2.5">Metode Setoran</label>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`p-3 md:p-4 rounded-[1rem] md:rounded-2xl flex flex-col items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base font-bold transition-all border-2 ${
                  method === 'transfer' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <CreditCard className={`w-5 h-5 md:w-6 md:h-6 ${method === 'transfer' ? 'text-emerald-500' : 'text-slate-400'}`} />
                Transfer Bank
              </button>
              <button
                type="button"
                onClick={() => setMethod('tunai')}
                className={`p-3 md:p-4 rounded-[1rem] md:rounded-2xl flex flex-col items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base font-bold transition-all border-2 ${
                  method === 'tunai' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 md:w-6 md:h-6 ${method === 'tunai' ? 'text-emerald-500' : 'text-slate-400'}`} />
                Tunai ke Panitia
              </button>
            </div>
          </div>

          {method === 'transfer' && (
            <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              {bankAccounts.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl md:rounded-2xl p-4 md:p-5 flex items-start gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white flex items-center justify-center shadow-sm text-blue-500 flex-shrink-0">
                    <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm text-blue-900 font-bold mb-2 md:mb-3">Transfer ke Rekening Resmi:</p>
                    <div className="space-y-2 md:space-y-3">
                      {bankAccounts.map((bank, i) => (
                        <div key={i} className="bg-white px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-blue-100/50 shadow-sm">
                          <p className="font-bold text-sm md:text-base text-slate-900 tracking-tight">{bank.bank_name} - {bank.account_number}</p>
                          <p className="text-xs md:text-sm text-slate-500 font-medium">a.n. {bank.account_name}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-blue-700 mt-2.5 bg-blue-100/50 inline-block px-2.5 py-1 rounded-lg">Pastikan nominal transfer sesuai di atas.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {method === 'tunai' && (
            <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl md:rounded-2xl p-4 md:p-5 flex items-start gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white flex items-center justify-center shadow-sm text-amber-500 flex-shrink-0">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-amber-900 font-bold mb-1">Himbauan Setor Tunai</p>
                  <p className="text-[11px] md:text-xs text-amber-800/80 leading-relaxed">
                    Pastikan setor ke petugas admin/bendahara (Bpk. Agustian atau Bpk. Heri). Jika dititipkan ke petugas masjid lainnya, mohon minta kwitansi fisik atau minimal foto serah terima uang sebagai bukti.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2.5">
              {method === 'transfer' ? 'Unggah Bukti Transfer' : 'Unggah Bukti (Kwitansi / Foto)'}
            </label>
            <div className={`mt-1 flex justify-center px-4 md:px-6 py-6 md:py-10 border-2 ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-emerald-400'} border-dashed rounded-2xl md:rounded-3xl bg-slate-50 hover:bg-emerald-50/20 transition-colors group cursor-pointer relative`}>
              <input 
                id="file-upload" 
                name="file-upload" 
                type="file" 
                accept="image/jpeg,image/png,application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="space-y-2.5 md:space-y-3 text-center pointer-events-none">
                <div className={`mx-auto w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-colors ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 group-hover:text-emerald-500 shadow-sm'}`}>
                  {file ? <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8" /> : <UploadCloud className="h-6 w-6 md:h-8 md:w-8" />}
                </div>
                <div className="flex flex-col text-xs md:text-sm text-slate-600 justify-center gap-0.5 md:gap-1">
                  <span className="font-bold text-emerald-600 text-sm md:text-base">{file ? 'File Dipilih' : 'Klik/seret file ke sini'}</span>
                  <span className="text-[10px] md:text-xs text-slate-500">JPG, PNG, atau PDF (Max. 2MB)</span>
                </div>
                {file && (
                  <p className="text-xs md:text-sm font-bold text-slate-700 mt-2 truncate max-w-[200px] md:max-w-xs mx-auto bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">{file.name}</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm md:text-base flex items-center justify-center gap-2"
            >
              {loading ? 'Sedang Memproses...' : 'Kirim Laporan Setoran'}
            </button>
          </div>
        </form>
      </div>

      <div className="hidden lg:block lg:col-span-4 sticky top-8">
        <div className="bg-gradient-to-b from-blue-50/50 to-white border border-blue-100/50 p-6 rounded-[2rem] shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Panduan Setoran</h3>
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">1</div>
              <div>
                <p className="font-bold text-sm text-slate-800">Cek Rekening Resmi</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Pastikan Anda hanya mentransfer ke rekening bank resmi milik masjid yang tertera.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">2</div>
              <div>
                <p className="font-bold text-sm text-slate-800">Simpan Bukti</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Setelah transfer, simpan struk atau *screenshot* mutasi untuk diunggah di form ini.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">3</div>
              <div>
                <p className="font-bold text-sm text-slate-800">Tunggu Verifikasi</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Admin akan memverifikasi laporan Anda dalam 1x24 jam. Saldo Anda akan otomatis bertambah.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="bg-blue-50 text-blue-800 text-xs p-4 rounded-xl font-medium leading-relaxed">
              Punya kendala saat transfer? Silakan hubungi Admin Masjid melalui tombol bantuan di halaman awal.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
