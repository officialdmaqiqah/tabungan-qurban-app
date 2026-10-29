'use client';

import { X, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { rejectTransactionAction } from '@/app/actions/transaction';

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

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await rejectTransactionAction({
        txId,
        adminNote: note,
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
        className={`p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors flex items-center justify-center ${
          loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`} 
        title="Tolak"
        aria-label="Tolak setoran"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Confirmation & Note Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
            onClick={handleCancel}
          ></div>
          
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden z-10 transform transition-all duration-300 scale-100 opacity-100">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tolak Setoran</h3>
                  <p className="text-sm text-slate-500">Rp {txAmount} dari {txName}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alasan Penolakan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Berikan alasan agar jamaah dapat memperbaikinya..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none bg-slate-50 focus:bg-white text-sm"
                  rows={3}
                  disabled={loading}
                  autoFocus
                ></textarea>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, Tolak Setoran</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
