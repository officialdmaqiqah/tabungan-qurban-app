'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InputTunaiForm({ 
  jamaahId,
  addTransaction
}: { 
  jamaahId: string,
  addTransaction: (amount: number) => Promise<{ success: boolean; error?: string }>
}) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    
    setLoading(true);
    try {
      const res = await addTransaction(Number(amount));
      
      if (!res.success) throw new Error(res.error);
      
      toast.success('Setoran tunai berhasil dicatat!');
      setAmount('');
    } catch (err: any) {
      toast.error('Gagal mencatat setoran: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-emerald-600" /> Catat Setoran Tunai
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nominal Setoran (Rp)</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1000"
            placeholder="Contoh: 500000"
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <button 
          type="submit"
          disabled={loading || !amount}
          className="w-full bg-emerald-600 text-white font-medium py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Transaksi tunai yang dicatat admin akan langsung berstatus <strong className="text-emerald-600">Verified</strong>.
        </p>
      </form>
    </div>
  );
}
