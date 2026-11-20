'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { deleteJamaah } from '@/app/actions/admin_jamaah';

const CONFIRM_WORD = 'HAPUS';

export default function DeleteJamaahButton({
  userId,
  fullName,
  phone,
  redirectTo,
  compact = false,
}: {
  userId: string;
  fullName: string;
  phone?: string | null;
  /** Halaman tujuan setelah berhasil (mis. dari halaman detail kembali ke daftar). */
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const open = () => {
    setConfirmText('');
    setIsOpen(true);
  };

  const close = () => {
    if (!loading) setIsOpen(false);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) return;
    setLoading(true);
    try {
      const res = await deleteJamaah(userId);
      if (!res.success) {
        toast.error(res.error, { duration: 7000 });
        return;
      }
      toast.success(res.message || 'Jamaah berhasil dihapus.');
      setIsOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        title="Hapus Jamaah"
        className={
          compact
            ? 'inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-lg font-medium transition-all shadow-xs'
            : 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors text-xs'
        }
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Hapus</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Hapus Jamaah"
        description="Untuk akun fiktif atau data percobaan"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        iconBgColor="bg-red-50 text-red-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="font-semibold text-slate-900 capitalize">{fullName}</div>
            {phone && <div className="text-xs text-slate-500 font-mono mt-0.5">{phone}</div>}
          </div>

          <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <p className="font-bold">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
              <p>Akun login, profil, paket pilihan, setoran yang belum diverifikasi, dan bukti transfernya akan dihapus.</p>
              <p>Jamaah yang sudah punya setoran <span className="font-semibold">terverifikasi</span> tidak bisa dihapus.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ketik <span className="font-mono font-bold text-red-600">{CONFIRM_WORD}</span> untuk konfirmasi
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={loading}
              autoFocus
              autoComplete="off"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-600 outline-none text-base text-slate-900 bg-white uppercase"
              placeholder={CONFIRM_WORD}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={close}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || confirmText.trim().toUpperCase() !== CONFIRM_WORD}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Menghapus...' : 'Hapus Permanen'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
