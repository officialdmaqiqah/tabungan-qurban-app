'use client';

import { useState } from 'react';
import { Package, CheckCircle2, Lock, Loader2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

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
    } catch (e) {
      toast.error('Gagal memilih paket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between ${
          isSelected 
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
            : 'border-slate-200 hover:border-emerald-200 hover:shadow-md'
        }`}
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Package className="w-6 h-6" />
            </span>
            {isSelected && (
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dipilih ({selectedQuantity}x)
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">{pkg.name}</h3>
          <p className="text-2xl font-black text-emerald-600 mb-4">{formatCurrency(pkg.price)}</p>
          {pkg.description && (
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {pkg.description}
            </p>
          )}
        </div>

        {isSelected ? (
          <button 
            disabled
            className="w-full bg-slate-50 text-slate-400 text-sm md:text-base font-bold py-3 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border border-slate-200"
          >
            <Lock className="w-4 h-4" /> Paket Terkunci
          </button>
        ) : (
          <button 
            onClick={() => { setQuantity(1); setShowModal(true); }}
            className="w-full bg-emerald-600 text-white text-sm md:text-base font-bold py-3 rounded-xl hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Pilih Paket Ini
          </button>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { if (!loading) setShowModal(false); }}
        title="Konfirmasi Pilihan Paket"
        description="Tentukan jumlah porsi qurban yang ingin Anda ikuti"
        icon={<Package className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        <div className="space-y-4">
          {/* Detail Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3 text-left">
            <div>
              <span className="text-xs text-slate-500 block">Nama Paket</span>
              <span className="font-bold text-slate-900 text-base">{pkg.name}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-100 text-xs">
              <span className="text-slate-500">Harga Satuan:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(pkg.price)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-emerald-100 text-xs">
              <span className="text-slate-500">Total Target Tabungan:</span>
              <span className="font-extrabold text-emerald-700 text-base">
                {formatCurrency(pkg.price * quantity)}
              </span>
            </div>
          </div>

          {/* Stepper Jumlah */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Jumlah Porsi:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={loading || quantity <= 1}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold disabled:opacity-40 transition-colors shadow-xs"
                aria-label="Kurangi"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-extrabold text-slate-900 text-base">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                disabled={loading}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold transition-colors shadow-xs"
                aria-label="Tambah"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/80 leading-relaxed">
            Paket yang sudah dipilih akan menjadi target resmi tabungan Anda. Jika terjadi kesalahan pemilihan, Anda dapat menghubungi admin.
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
            >
              Batal
            </button>
            <button 
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>{loading ? 'Memproses...' : 'Ya, Pilih Paket'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
