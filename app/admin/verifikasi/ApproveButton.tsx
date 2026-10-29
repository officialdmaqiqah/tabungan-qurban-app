'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { approveTransactionAction } from '@/app/actions/transaction';

interface ApproveButtonProps {
  txId: string;
  txAmount: string;
  txName: string;
}

export default function ApproveButton({ txId, txAmount, txName }: ApproveButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await approveTransactionAction({ txId, txAmount, txName });
      if (res.success) {
        toast.success(`Setoran Rp ${txAmount} berhasil disetujui!`);
      } else {
        toast.error(res.error || 'Gagal menyetujui setoran.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={loading}
      className={`p-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-colors flex items-center justify-center ${
        loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      }`}
      title={loading ? 'Memproses...' : 'Setujui'}
      aria-label="Setujui setoran"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
    </button>
  );
}
