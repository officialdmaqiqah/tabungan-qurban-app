'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { approveTransactionAction } from '@/app/actions/transaction';
import Modal from '@/components/ui/Modal';

interface ApproveButtonProps {
  txId: string;
  txAmount: string;
  txName: string;
  method?: string;
  status?: string;
}

export default function ApproveButton({
  txId,
  txAmount,
  txName,
  method = 'transfer',
  status = 'pending',
}: ApproveButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    if (loading) return;
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleApprove = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await approveTransactionAction({ txId, txAmount, txName });
      if (res.success) {
        toast.success(`Setoran Rp ${txAmount} berhasil diverifikasi!`);
        handleClose();
      } else {
        toast.error(res.error || 'Gagal memverifikasi setoran.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-colors flex items-center justify-center disabled:opacity-50"
        title="Verifikasi Setoran"
        aria-label="Verifikasi setoran"
      >
        <Check className="w-4 h-4" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Verifikasi Setoran"
        description="Periksa dan konfirmasi setoran tabungan jamaah"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        <div className="space-y-4">
          {/* Detail Box Vertikal */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 space-y-3 text-left">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Rincian Setoran</span>
            </div>

            <div className="bg-white/90 rounded-lg p-3 space-y-2 border border-emerald-100 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Nama Jamaah</span>
                <span className="font-semibold text-slate-900 text-sm capitalize break-words">
                  {txName || 'Hamba Allah'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block text-[11px]">Nominal</span>
                <span className="font-extrabold text-emerald-600 text-base break-words">
                  Rp {txAmount}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[11px]">Metode</span>
                  <span className="font-semibold text-slate-800 capitalize">{method}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 capitalize">
                    {status === 'pending' ? 'Menunggu' : status}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Setelah disetujui, nominal setoran akan otomatis ditambahkan ke total tabungan jamaah dan notifikasi konfirmasi WhatsApp akan dikirimkan.
            </p>
          </div>

          {/* Action Buttons: [Batal] [Ya, Verifikasi] */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>{loading ? 'Memverifikasi...' : 'Ya, Verifikasi'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
