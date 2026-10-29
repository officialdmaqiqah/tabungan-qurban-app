'use client';

import { useState } from 'react';
import { updateJamaahName } from '@/app/actions/jamaah';
import { Pencil, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

interface EditNameModalProps {
  user: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
  isCurrentSuperAdmin: boolean;
}

export default function EditNameModal({ user, isCurrentSuperAdmin }: EditNameModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(user.full_name || '');
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentFullName, setCurrentFullName] = useState(user.full_name || '');

  if (!isCurrentSuperAdmin) {
    return null;
  }

  const handleOpen = () => {
    setNewName(currentFullName);
    setIsConfirming(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
    setIsConfirming(false);
  };

  // Live Title Case Preview generator
  const getTitleCasePreview = (str: string) => {
    const cleaned = str.trim().replace(/\s+/g, ' ');
    if (!cleaned) return '';
    return cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const normalizedCandidate = getTitleCasePreview(newName);

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
    if (loading) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('newName', newName);

      const res = await updateJamaahName(formData);

      if (res.success) {
        toast.success(res.message || 'Nama jamaah berhasil diperbarui');
        if (res.normalizedName) {
          setCurrentFullName(res.normalizedName);
        }
        handleClose();
      } else {
        toast.error(res.error || 'Gagal mengubah nama jamaah');
        setIsConfirming(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
      setIsConfirming(false);
    } finally {
      setLoading(false);
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

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Nama Jamaah"
        description="Ubah penulisan nama jamaah yang terdaftar"
        icon={<Pencil className="w-5 h-5 text-blue-600" />}
        iconBgColor="bg-blue-50 text-blue-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        {/* Info Jamaah Saat Ini */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs sm:text-sm space-y-2">
          <div className="flex justify-between items-start gap-2">
            <span className="text-slate-500 font-medium shrink-0">Nama Saat Ini:</span>
            <span className="font-semibold text-slate-900 text-right break-words">{currentFullName || '-'}</span>
          </div>
          <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-slate-200/50">
            <span className="text-slate-500 font-medium shrink-0">No. WhatsApp:</span>
            <span className="font-mono text-xs text-slate-700">{user.phone || '-'}</span>
          </div>
        </div>

        {/* Confirmation Mode */}
        {isConfirming ? (
          <div className="space-y-4 py-1">
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 space-y-3 text-left">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Konfirmasi Perubahan Nama</span>
              </div>

              {/* Vertical Standard Layout */}
              <div className="bg-white/90 rounded-lg p-3 space-y-2.5 border border-amber-200/70 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Nama Saat Ini</span>
                  <span className="font-semibold text-slate-900 text-sm break-words">{currentFullName}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Akan Diubah Menjadi</span>
                  <span className="font-bold text-blue-700 text-sm break-words">{normalizedCandidate}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini hanya mengubah nama tampilan jamaah dan akan dicatat di log aktivitas sistem.
              </p>
            </div>

            {/* Buttons: [Batal] [Ya, Simpan Nama] */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>{loading ? 'Menyimpan...' : 'Ya, Simpan Nama'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Input Form Mode */
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Nama Lengkap Baru
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Agustian Safitri"
                required
                disabled={loading}
                autoFocus
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all bg-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Format otomatis dinormalisasi menjadi Title Case (huruf besar di awal kata).
              </p>
            </div>

            {/* Live Preview */}
            {normalizedCandidate && normalizedCandidate !== currentFullName && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs space-y-1">
                <span className="text-blue-600 font-medium block text-[11px]">Preview Hasil Normalisasi:</span>
                <span className="font-bold text-blue-900 text-sm break-words">{normalizedCandidate}</span>
              </div>
            )}

            {/* Buttons: [Batal] [Lanjutkan] */}
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
                type="submit"
                disabled={loading || !normalizedCandidate || normalizedCandidate === currentFullName}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Lanjutkan</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
