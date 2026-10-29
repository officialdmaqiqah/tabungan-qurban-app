'use client';

import { useState } from 'react';
import { PlusCircle, Wallet, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

export default function InputTunaiForm({ 
  jamaahId,
  jamaahName,
  addTransaction
}: { 
  jamaahId: string,
  jamaahName?: string,
  addTransaction: (amount: number) => Promise<{ success: boolean; error?: string }>
}) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const numAmount = Number(amount) || 0;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) {
      toast.error('Masukkan nominal setoran yang valid.');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (loading || numAmount <= 0) return;
    setLoading(true);
    try {
      const res = await addTransaction(numAmount);
      
      if (!res.success) throw new Error(res.error);
      
      toast.success(`Setoran tunai ${formatCurrency(numAmount)} berhasil dicatat!`);
      setAmount('');
      setIsConfirmOpen(false);
    } catch (err: any) {
      toast.error('Gagal mencatat setoran: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [50000, 100000, 250000, 500000, 1000000];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-emerald-600" /> Catat Setoran Tunai
      </h3>
      
      <form onSubmit={handleOpenConfirm} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
            Nominal Setoran (Rp)
          </label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1000"
            placeholder="Contoh: 500000"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-base font-semibold text-slate-900 transition-all bg-white"
          />

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickAmounts.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-medium rounded-lg transition-colors border border-slate-200/60"
              >
                +{val >= 1000000 ? `${val / 1000000} Jt` : `${val / 1000} Rb`}
              </button>
            ))}
          </div>

          {/* Live Formatted Currency Preview */}
          {numAmount > 0 && (
            <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium">Terbaca:</span>
              <span className="font-black text-emerald-800 text-sm">{formatCurrency(numAmount)}</span>
            </div>
          )}
        </div>

        <button 
          type="submit"
          disabled={loading || numAmount <= 0}
          className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50"
        >
          Lanjutkan Simpan
        </button>

        <p className="text-xs text-slate-400 text-center leading-relaxed">
          Setoran tunai yang dicatat admin akan langsung berstatus <strong className="text-emerald-600">Verified</strong> dan menambahkan saldo jamaah.
        </p>
      </form>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => { if (!loading) setIsConfirmOpen(false); }}
        title="Konfirmasi Setoran Tunai"
        description="Periksa kembali nominal setoran tunai sebelum disimpan"
        icon={<Wallet className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3 text-left">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Rincian Setoran</span>
            </div>

            <div className="bg-white/90 rounded-lg p-3 space-y-2 border border-emerald-100 text-xs">
              {jamaahName && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Nama Jamaah</span>
                  <span className="font-semibold text-slate-900 text-sm break-words">{jamaahName}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-100">
                <span className="text-slate-500 block text-[11px]">Nominal Tunai</span>
                <span className="font-extrabold text-emerald-600 text-base break-words">
                  {formatCurrency(numAmount)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-100 flex justify-between">
                <span className="text-slate-500 text-[11px]">Metode:</span>
                <span className="font-bold text-slate-800">Tunai (Langsung Verified)</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Saldo tabungan jamaah akan langsung bertambah dan tercatat di buku tabungan serta audit log.
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
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
