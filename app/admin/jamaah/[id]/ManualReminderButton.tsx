'use client';

import { useState } from 'react';
import { MessageCircle, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendManualReminderWA } from '@/app/actions/transaction_whatsapp';
import Modal from '@/components/ui/Modal';

interface ManualReminderButtonProps {
  userId: string;
  isOptIn: boolean;
  phone: string;
}

export default function ManualReminderButton({ userId, isOptIn, phone }: ManualReminderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    if (!isOptIn || !phone) {
      toast.error('Jamaah belum menyetujui notifikasi WA atau nomor kosong.');
      return;
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await sendManualReminderWA(userId);
      if (res.success) {
        toast.success(res.message || 'Pesan pengingat berhasil dikirim!');
        handleClose();
      } else {
        toast.error('Gagal mengirim: ' + res.error);
      }
    } catch (error: any) {
      toast.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOptIn || !phone) {
    return (
      <button 
        disabled
        title="Jamaah belum menyetujui WhatsApp atau nomor belum terdaftar"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>Kirim Reminder (Non-aktif)</span>
      </button>
    );
  }

  return (
    <>
      <button 
        onClick={handleOpen}
        disabled={loading}
        title="Kirim Pesan Pengingat Tabungan"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>Kirim Reminder</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Kirim Reminder Tabungan"
        description="Kirim notifikasi ringkasan tabungan ke WhatsApp jamaah"
        icon={<MessageCircle className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2 text-left">
            <div className="text-xs text-slate-500 font-medium">Tujuan Pengiriman:</div>
            <div className="font-mono text-sm font-bold text-slate-900">{phone}</div>
            <p className="text-xs text-slate-600 pt-1 border-t border-emerald-100 leading-relaxed">
              Pesan akan memuat rangkuman resmi berupa: target paket qurban, total saldo terverifikasi saat ini, dan sisa kewajiban tabungan.
            </p>
          </div>

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
              onClick={handleSend}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 shrink-0" />
                  <span>Ya, Kirim Pesan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
