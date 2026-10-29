'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendWhatsAppMessage } from '@/app/actions/whatsapp';
import toast from 'react-hot-toast';
import { Send, Loader2 } from 'lucide-react';

export default function TestWAForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) {
      toast.error('Nomor tujuan dan isi pesan harus diisi.');
      return;
    }

    setLoading(true);
    try {
      await sendWhatsAppMessage({
        to: phone,
        message: message,
        eventType: 'test_message'
      });
      toast.success('Pesan uji coba berhasil dikirim!');
      setPhone('');
      setMessage('');
      router.refresh();
    } catch (error: any) {
      toast.error('Gagal mengirim test: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleTest} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
          Nomor WhatsApp Tujuan
        </label>
        <input 
          type="text" 
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Contoh: 08123456789"
          disabled={loading}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
          Isi Pesan Uji Coba
        </label>
        <textarea 
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tulis pesan pengujian di sini..."
          disabled={loading}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none bg-white"
        />
      </div>
      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Mengirim Pesan...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 shrink-0" />
            <span>Kirim Pesan Uji Coba</span>
          </>
        )}
      </button>
    </form>
  );
}
