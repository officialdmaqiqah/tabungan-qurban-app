'use client';

import { useState } from 'react';
import { UserRole, ROLE_LABELS } from '@/lib/roles';
import { updateUserRole } from '@/app/actions/role';
import { Shield, ShieldAlert, UserCheck, User, AlertCircle, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

interface ChangeRoleModalProps {
  user: {
    id: string;
    full_name: string | null;
    phone: string | null;
    role: UserRole;
  };
  isCurrentSuperAdmin: boolean;
  currentUserId?: string;
}

export default function ChangeRoleModal({
  user,
  isCurrentSuperAdmin,
  currentUserId,
}: ChangeRoleModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isCurrentSuperAdmin) {
    return null;
  }

  const isSelf = currentUserId === user.id;

  const handleOpen = () => {
    setSelectedRole(user.role);
    setIsConfirming(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
    setIsConfirming(false);
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === user.role) {
      toast.error('Pilih role yang berbeda dengan role saat ini.');
      return;
    }
    if (isSelf && selectedRole !== 'super_admin') {
      toast.error('Anda tidak dapat menurunkan role Super Admin Anda sendiri.');
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('targetUserId', user.id);
      formData.append('newRole', selectedRole);

      const res = await updateUserRole(formData);

      if (res.success) {
        toast.success(res.message || 'Role pengguna berhasil diperbarui!');
        handleClose();
      } else {
        toast.error(res.error || 'Gagal mengubah role');
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
        title="Ubah Role Pengguna"
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg font-medium transition-all shadow-xs"
      >
        <Shield className="w-3.5 h-3.5 text-emerald-600" />
        <span>Ubah Role</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Ubah Role Pengguna"
        description="Kelola hak akses dan tingkat wewenang akun jamaah"
        icon={<Shield className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
        maxWidth="max-w-lg"
        disableBackdropClick={loading}
      >
        {/* Info Pengguna */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs sm:text-sm space-y-2">
          <div className="flex justify-between items-start gap-2">
            <span className="text-slate-500 font-medium shrink-0">Nama Jamaah:</span>
            <span className="font-semibold text-slate-900 text-right break-words">{user.full_name || 'Hamba Allah'}</span>
          </div>
          <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-slate-200/50">
            <span className="text-slate-500 font-medium shrink-0">No. WhatsApp:</span>
            <span className="font-mono text-xs text-slate-700">{user.phone || '-'}</span>
          </div>
          <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-slate-200/50">
            <span className="text-slate-500 font-medium shrink-0">Role Saat Ini:</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>

        {/* Confirmation Mode */}
        {isConfirming ? (
          <div className="space-y-4 py-1">
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 space-y-3 text-left">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Konfirmasi Penetapan Role</span>
              </div>

              {/* Standard Vertical Layout */}
              <div className="bg-white/90 rounded-lg p-3 space-y-2.5 border border-amber-200/70 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Nama Jamaah</span>
                  <span className="font-semibold text-slate-900 text-sm break-words">{user.full_name || 'Hamba Allah'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Role Saat Ini</span>
                    <span className="font-medium text-slate-700 text-sm">{ROLE_LABELS[user.role]}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Role Baru</span>
                    <span className="font-bold text-emerald-700 text-sm">{ROLE_LABELS[selectedRole]}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Tetapkan <strong>{user.full_name || 'jamaah'}</strong> sebagai <strong>{ROLE_LABELS[selectedRole]}</strong>? Tindakan ini akan dicatat ke dalam audit log sistem.
              </p>
            </div>

            {/* Buttons: [Batal] [Ya, Tetapkan Role] */}
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
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>{loading ? 'Menyimpan...' : 'Ya, Tetapkan Role'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Selection Mode */
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Pilih Role Baru:
              </label>

              {/* Option 1: Jamaah */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedRole === 'jamaah'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="jamaah"
                  checked={selectedRole === 'jamaah'}
                  onChange={() => setSelectedRole('jamaah')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-900">Jamaah</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed break-words">
                    Role standar. Dapat memilih paket qurban, melihat saldo tabungan, dan lapor setoran.
                  </p>
                </div>
              </label>

              {/* Option 2: Admin/Bendahara */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedRole === 'admin'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={selectedRole === 'admin'}
                  onChange={() => setSelectedRole('admin')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-900">Admin/Bendahara</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed break-words">
                    Operasional keuangan. Dapat verifikasi setoran, input setoran tunai, melihat laporan & bukti transfer, serta kelola paket.
                  </p>
                </div>
              </label>

              {/* Option 3: Super Admin */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedRole === 'super_admin'
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="super_admin"
                  checked={selectedRole === 'super_admin'}
                  onChange={() => setSelectedRole('super_admin')}
                  className="mt-1 text-purple-600 focus:ring-purple-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-900">Super Admin</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed break-words">
                    Akses tertinggi. Seluruh hak admin ditambah manajemen role pengguna, edit nama jamaah, dan konfigurasi keamanan sistem.
                  </p>
                </div>
              </label>
            </div>

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
                disabled={loading || selectedRole === user.role}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
