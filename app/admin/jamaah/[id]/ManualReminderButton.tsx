'use client';

import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendManualReminderWA } from '@/app/actions/transaction_whatsapp';

interface ManualReminderButtonProps {
  userId: string;
  isOptIn: boolean;
  phone: string;
}

export default function ManualReminderButton({ userId, isOptIn, phone }: ManualReminderButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!isOptIn || !phone) {
      toast.error('Jamaah belum menyetujui notifikasi WA atau nomor kosong.');
      return;
    }

    if (!window.confirm('Kirim pesan reminder manual ke jamaah ini? Pesan akan berisi info saldo dan target.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await sendManualReminderWA(userId);
      if (res.success) {
        toast.success(res.message || 'Reminder terkirim!');
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
        title="Jamaah belum setuju WA atau nomor kosong"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Kirim Reminder (Disabled)
      </button>
    );
  }

  return (
    <button 
      onClick={handleSend}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
      {loading ? 'Mengirim...' : 'Kirim Reminder'}
    </button>
  );
}
