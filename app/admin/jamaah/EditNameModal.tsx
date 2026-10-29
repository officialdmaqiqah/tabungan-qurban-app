'use client';

import { useState } from 'react';
import { updateJamaahName } from '@/app/actions/jamaah';
import { normalizeName } from '@/lib/utils';
import { Pencil, AlertCircle, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface EditNameModalProps {
  user: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
  isCurrentSuperAdmin: boolean;
}

export default function EditNameModal({
  user,
  isCurrentSuperAdmin,
}: EditNameModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(user.full_name || '');
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isCurrentSuperAdmin) {
    return null;
  }

  const handleOpen = () => {
    setNewName(user.full_name || '');
    setIsConfirming(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
    setIsConfirming(false);
  };

  const currentFullName = user.full_name || '';
  const normalizedCandidate = normalizeName(newName);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedCandidate || normalizedCandidate.length < 2) {
      toast.error('Nama baru minimal 2 karakter.');
      return;
    }
    if (normalizedCandidate === currentFullName) {
      toast.error('Nama baru sama dengan nama saat ini.');
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('newName', normalizedCandidate);

      const res = await updateJamaahName(formData);
      if (res.success) {
        toast.success(res.message || 'Nama jamaah berhasil diperbarui');
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal mengubah nama jamaah');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
      setIsConfirming(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        title="Edit Nama Jamaah"
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg font-medium transition-all shadow-xs"
      >
        <Pencil className="w-3.5 h-3.5 text-blue-600" />
        <span>Edit Nama</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Nama Jamaah</h3>
                  <p className="text-xs text-slate-500">Ubah penulisan nama jamaah yang terdaftar</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Info */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-sm space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Nama Saat Ini:</span>
                <span className="font-semibold text-slate-900">{currentFullName || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">No. WhatsApp:</span>
                <span className="font-mono text-xs text-slate-700">{user.phone || '-'}</span>
              </div>
            </div>

            {/* Confirmation Mode */}
            {isConfirming ? (
              <div className="space-y-4 py-2">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Konfirmasi Perubahan Nama</h4>
                  <p className="text-sm text-slate-800 font-semibold">
                    Ubah nama {currentFullName} menjadi {normalizedCandidate}?
                  </p>
                  <p className="text-xs text-slate-500">
                    Tindakan ini hanya mengubah nama tampilan jamaah dan akan dicatat ke dalam audit log sistem.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirming(false)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Menyimpan...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Ya, Simpan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Input Form Mode */
              <form onSubmit={handleProceedToConfirm} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="newName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Nama Baru:
                  </label>
                  <input
                    id="newName"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Agustian Safitri"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-900"
                  />
                  {normalizedCandidate && normalizedCandidate !== newName && (
                    <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded-lg">
                      Format Title Case: <strong className="text-slate-800">{normalizedCandidate}</strong>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Sistem otomatis merapikan spasi dan mengubah format ke Title Case (kapital di awal kata).
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!normalizedCandidate || normalizedCandidate === currentFullName}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
