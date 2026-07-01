'use client';

import { useState } from 'react';
import { sendWhatsAppMessage } from '@/app/actions/whatsapp';
import toast from 'react-hot-toast';
import { Send, Loader2 } from 'lucide-react';

export default function TestWAForm() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) {
      toast.error('Nomor dan pesan harus diisi');
      return;
    }

    setLoading(true);
    try {
      await sendWhatsAppMessage({
        to: phone,
        message: message,
        eventType: 'test_message'
      });
      toast.success('Test terkirim (cek log di bawah)');
      setPhone('');
      setMessage('');
      // Force refresh page to see new log
      window.location.reload();
    } catch (error: any) {
      toast.error('Gagal mengirim test: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleTest} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Tujuan</label>
        <input 
          type="text" 
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="08123456789"
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Isi Pesan</label>
        <textarea 
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pesan test..."
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none bg-white"
        ></textarea>
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? 'Mengirim...' : 'Kirim Test'}
      </button>
    </form>
  );
}
