'use client';

import { useState } from 'react';
import { KeyRound, CheckCircle2, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

export default function ResetPasswordButton({
  userId,
  resetAction,
}: {
  userId: string;
  resetAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    setSuccess(false);
    setNewPassword('');
    setCopied(false);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
  };

  const handleCopy = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.success('Password berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('newPassword', newPassword);

      const result = await resetAction(formData);

      if (result.success) {
        toast.success('Password berhasil direset!');
        setSuccess(true);
      } else {
        toast.error(result.error || 'Gagal mereset password.');
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
        onClick={handleOpen}
        type="button"
        title="Reset Password Jamaah"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-xs"
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span>Reset Password</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Reset Password Jamaah"
        description="Atur ulang password login akun jamaah secara manual"
        icon={<KeyRound className="w-5 h-5 text-amber-600" />}
        iconBgColor="bg-amber-50 text-amber-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading}
      >
        {success ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">Password Berhasil Diubah!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Salin password di bawah ini dan teruskan kepada jamaah melalui WhatsApp agar jamaah dapat login kembali.
              </p>
            </div>

            {/* Password Display Box with Copy Button */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 px-4 font-mono text-base font-bold text-slate-800 tracking-wider">
              <span>{newPassword}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Warning Callout */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 space-y-1 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block mb-0.5">Perhatian:</span>
                Password lama jamaah akan langsung digantikan dengan password baru ini. Jamaah harus menggunakan password baru untuk login berikutnya.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Password Baru <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru (min. 6 karakter)"
                disabled={loading}
                autoFocus
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition-all bg-white"
              />
            </div>

            {/* Buttons: [Batal] [Simpan Password] */}
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
                disabled={loading || newPassword.length < 6}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>{loading ? 'Menyimpan...' : 'Simpan Password'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
