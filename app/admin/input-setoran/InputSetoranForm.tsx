'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, CheckCircle2, UserCircle2, Coins, Search, FileImage, Loader2, AlertCircle, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

export default function InputSetoranForm({ 
  jamaahList,
  addTransaction
}: { 
  jamaahList: any[];
  addTransaction: (formData: FormData) => Promise<{ success: boolean; error?: string }>
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  const [search, setSearch] = useState('');
  const [selectedJamaahId, setSelectedJamaahId] = useState('');
  const [transactionType, setTransactionType] = useState('setoran');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('tunai');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const filteredJamaah = jamaahList.filter(j => 
    j.full_name.toLowerCase().includes(search.toLowerCase()) || 
    j.phone.includes(search)
  );

  const selectedJamaah = jamaahList.find(j => j.id === selectedJamaahId);
  const numAmount = Number(amount) || 0;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJamaahId) return toast.error('Pilih jamaah terlebih dahulu');
    if (!amount || numAmount <= 0) return toast.error('Masukkan nominal yang valid');
    if (method === 'transfer' && !proofFile) return toast.error('Harap unggah bukti transfer');
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (loading || !selectedJamaahId || numAmount <= 0) return;
    setLoading(true);
    try {
      let proofUrl = '';

      if (method === 'transfer' && proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `transfers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('transfer_proofs')
          .upload(filePath, proofFile);

        if (uploadError) throw uploadError;

        proofUrl = 'transfer_proofs/' + filePath;
      }

      const formData = new FormData();
      formData.append('userId', selectedJamaahId);
      formData.append('amount', amount);
      formData.append('method', method);
      formData.append('transactionType', transactionType);
      if (proofUrl) {
        formData.append('proofUrl', proofUrl);
      }

      const res = await addTransaction(formData);
      
      if (!res.success) throw new Error(res.error);
      
      toast.success(transactionType === 'setoran' ? 'Setoran berhasil dicatat!' : 'Penarikan berhasil dicatat!');
      setAmount('');
      setMethod('tunai');
      setTransactionType('setoran');
      setProofFile(null);
      setSelectedJamaahId('');
      setSearch('');
      setIsConfirmOpen(false);
    } catch (err: any) {
      toast.error('Gagal mencatat setoran: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 md:p-8">
        <form onSubmit={handleOpenConfirm} className="space-y-6">
          
          {/* Pilih Jamaah */}
          <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <UserCircle2 className="w-5 h-5 text-blue-600" />
              1. Pilih Jamaah
            </h3>
            
            <div className="space-y-3">
              <select
                value={selectedJamaahId}
                onChange={(e) => setSelectedJamaahId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-800 bg-white"
                required
              >
                <option value="">-- Pilih Jamaah --</option>
                {jamaahList.map((j) => (
                  <option key={j.id} value={j.id} className="capitalize">
                    {j.full_name} ({j.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detail Transaksi */}
          {selectedJamaahId && (
            <div className="space-y-4 bg-emerald-50/50 p-4 sm:p-5 rounded-xl border border-emerald-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                2. Detail Transaksi
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Jenis Transaksi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransactionType('setoran')}
                      className={`py-2 px-3 text-sm font-medium border rounded-lg transition-all ${
                        transactionType === 'setoran' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Setoran (Uang Masuk)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType('penarikan')}
                      className={`py-2 px-3 text-sm font-medium border rounded-lg transition-all ${
                        transactionType === 'penarikan' 
                        ? 'bg-red-50 border-red-500 text-red-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Penarikan (Uang Keluar)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Metode {transactionType === 'setoran' ? 'Penyetoran' : 'Pemberian Uang'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod('tunai')}
                      className={`py-2 px-3 text-sm font-medium border rounded-lg transition-all ${
                        method === 'tunai' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('transfer')}
                      className={`py-2 px-3 text-sm font-medium border rounded-lg transition-all ${
                        method === 'transfer' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Transfer
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Nominal (Rp)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="1000"
                    placeholder="Contoh: 500000"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-slate-900 text-base placeholder:text-slate-400 caret-emerald-700 font-semibold"
                  />
                  {amount && <p className="text-xs text-emerald-600 mt-1.5 font-medium">{formatCurrency(Number(amount))}</p>}
                </div>
              </div>

              {method === 'transfer' && (
                <div className="mt-4 pt-4 border-t border-emerald-100">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Upload Bukti Transfer *</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      id="proof-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setProofFile(e.target.files[0]);
                        }
                      }}
                    />
                    <label 
                      htmlFor="proof-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      {proofFile ? (
                        <>
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium text-emerald-700">{proofFile.name}</p>
                          <p className="text-xs text-slate-500">Klik untuk mengganti foto</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium text-slate-700">Pilih foto/screenshot bukti</p>
                          <p className="text-xs text-slate-500">Format: JPG, PNG</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tombol Simpan */}
          <button 
            type="submit"
            disabled={loading || !selectedJamaahId || !amount || (method === 'transfer' && !proofFile)}
            className={`w-full font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white ${
              transactionType === 'setoran' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? (
              <>Menyimpan...</>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> 
                {transactionType === 'setoran' ? 'Simpan Setoran' : 'Simpan Penarikan'}
              </>
            )}
          </button>
          <p className="text-xs text-slate-500 text-center">
            Transaksi yang diinput Admin otomatis berstatus <span className="text-emerald-600 font-semibold">Verified</span>.
          </p>
        </form>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => { if (!loading) setIsConfirmOpen(false); }}
        title={transactionType === 'setoran' ? 'Konfirmasi Catat Setoran' : 'Konfirmasi Catat Penarikan'}
        description="Periksa kembali rincian transaksi sebelum disimpan ke sistem"
        icon={transactionType === 'setoran' ? <Wallet className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
        iconBgColor={transactionType === 'setoran' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        <div className="space-y-4">
          <div className={`border rounded-xl p-4 space-y-3 text-left ${transactionType === 'setoran' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'}`}>
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${transactionType === 'setoran' ? 'text-emerald-800' : 'text-red-800'}`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Rincian Transaksi</span>
            </div>

            <div className="bg-white/90 rounded-lg p-3 space-y-2 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Nama Jamaah</span>
                <span className="font-semibold text-slate-900 text-sm capitalize break-words">
                  {selectedJamaah?.full_name || '-'}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-100">
                <span className="text-slate-500 block text-[11px]">Nominal</span>
                <span className={`font-extrabold text-base break-words ${transactionType === 'setoran' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(numAmount)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[11px]">Jenis</span>
                  <span className="font-bold text-slate-800 capitalize">{transactionType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Metode</span>
                  <span className="font-semibold text-slate-800 capitalize">{method}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Transaksi ini akan langsung berstatus <strong>Verified</strong> dan tercatat ke buku tabungan jamaah.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={loading}
              className={`w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                transactionType === 'setoran' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>{loading ? 'Menyimpan...' : 'Ya, Simpan Transaksi'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
