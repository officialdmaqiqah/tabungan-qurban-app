'use client';

import { useState } from 'react';
import { Package, CheckCircle2, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Pkg {
  id: string;
  name: string;
  price: number;
  description: string | null;
}

interface PackageCardProps {
  pkg: Pkg;
  selectedQuantity: number;
  onSelect: (packageId: string, quantity: number) => Promise<void>;
}

export default function PackageCard({ pkg, selectedQuantity, onSelect }: PackageCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const isSelected = selectedQuantity > 0;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onSelect(pkg.id, quantity);
      toast.success('Paket berhasil dipilih!');
      setShowModal(false);
    } catch (error) {
      toast.error('Gagal memilih paket.');
    } finally {
      setLoading(false);
    }
  };

  const isSapi = pkg.name.toLowerCase().includes('sapi');
  const isKambing = pkg.name.toLowerCase().includes('kambing');
  
  let iconText = '📦';
  let badgeText = '';
  let badgeColor = 'bg-slate-100 text-slate-600';
  
  if (isSapi) {
    iconText = '🐮';
    badgeText = 'SAPI';
    badgeColor = 'bg-blue-100 text-blue-700';
  } else if (isKambing) {
    iconText = '🐐';
    badgeText = 'KAMBING';
    badgeColor = 'bg-amber-100 text-amber-700';
  }

  return (
    <>
      <div 
        className={`bg-white p-6 rounded-2xl border ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-md' : 'border-slate-200 shadow-sm'} transition-all flex flex-col`}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className={`text-3xl p-2 rounded-xl bg-slate-50 flex items-center justify-center`}>
              {iconText}
            </div>
            <div className="flex items-center gap-2">
              {badgeText && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${badgeColor}`}>
                  {badgeText}
                </span>
              )}
              {isSelected && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4" /> Terpilih {selectedQuantity}
                </span>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-slate-900">{pkg.name}</h3>
          <p className="text-2xl font-bold text-emerald-600 mt-2 mb-4">{formatCurrency(pkg.price)}</p>
          
          {pkg.description && (
            <p className="text-sm text-slate-600 mb-6">{pkg.description}</p>
          )}
        </div>

        {isSelected ? (
          <button 
            disabled
            className="w-full bg-slate-100 text-slate-400 font-medium py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Paket Terkunci
          </button>
        ) : (
          <button 
            onClick={() => setShowModal(true)}
            className="w-full bg-emerald-600 text-white font-medium py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md"
          >
            Pilih Paket Ini
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Konfirmasi Pilihan</h3>
            <p className="text-slate-600 mb-4">
              Pilih jumlah untuk paket <strong>{pkg.name}</strong>.
            </p>
            <div className="mb-6 flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700">Jumlah:</label>
              <input 
                type="number" 
                min="1" 
                value={quantity} 
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-center font-bold"
              />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-6 border border-amber-100">
              Paket yang sudah dipilih tidak bisa diubah sendiri. Jika ada kesalahan, hubungi admin.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirm}
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 text-white font-medium hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-70"
              >
                {loading ? 'Memproses...' : 'Ya, Pilih Paket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
