'use client';

import { X, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { rejectTransactionAction } from '@/app/actions/transaction';
import Modal from '@/components/ui/Modal';

interface RejectButtonProps {
  txId: string;
  txAmount: string;
  txName: string;
}

export default function RejectButton({ txId, txAmount, txName }: RejectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setIsOpen(true);
    setNote('');
  };

  const handleCancel = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNote = note.trim();
    if (!cleanNote || cleanNote.length < 5) {
      toast.error('Harap isi alasan penolakan (minimal 5 karakter).');
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      const res = await rejectTransactionAction({
        txId,
        adminNote: cleanNote,
        txAmount,
        txName,
      });

      if (res.success) {
        toast.success(`Setoran Rp ${txAmount} berhasil ditolak.`);
        setIsOpen(false);
      } else {
        toast.error(res.error || 'Gagal menolak setoran.');
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
        onClick={handleOpenClick}
        disabled={loading}
        className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors flex items-center justify-center disabled:opacity-50"
        title="Tolak Setoran"
        aria-label="Tolak setoran"
      >
        <X className="w-4 h-4" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title="Tolak Setoran"
        description="Berikan keterangan penolakan setoran untuk jamaah"
        icon={<XCircle className="w-5 h-5 text-red-600" />}
        iconBgColor="bg-red-50 text-red-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        <form onSubmit={handleConfirm} className="space-y-4">
          {/* Detail Box */}
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 space-y-2 text-left">
            <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Rincian Setoran Ditolak</span>
            </div>
            <div className="bg-white/90 rounded-lg p-3 space-y-2 border border-red-100 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Nama Jamaah</span>
                <span className="font-semibold text-slate-900 text-sm capitalize break-words">
                  {txName || 'Hamba Allah'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block text-[11px]">Nominal</span>
                <span className="font-extrabold text-red-600 text-base break-words">
                  Rp {txAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Input Alasan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Bukti transfer buram / nominal tidak sesuai mutasi..."
              required
              minLength={5}
              disabled={loading}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none bg-white text-sm"
              rows={3}
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Alasan ini akan dikirimkan otomatis kepada jamaah melalui notifikasi WhatsApp agar dapat diperbaiki.
            </p>
          </div>

          {/* Action Buttons: [Batal] [Ya, Tolak Setoran] */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || note.trim().length < 5}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>{loading ? 'Memproses...' : 'Ya, Tolak Setoran'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
