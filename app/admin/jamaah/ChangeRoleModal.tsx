'use client';

import { useState } from 'react';
import { UserRole, ROLE_LABELS } from '@/lib/roles';
import { updateUserRole } from '@/app/actions/role';
import { Shield, ShieldAlert, UserCheck, User, AlertCircle, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

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
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('role', selectedRole);

      const res = await updateUserRole(formData);
      if (res.success) {
        toast.success(res.message || 'Role pengguna berhasil diperbarui!');
        setIsOpen(false);
      } else {
        toast.error(res.error || 'Gagal mengubah role');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
      setIsConfirming(false);
    }
  };

  const getConfirmationText = () => {
    const name = user.full_name || 'Pengguna';
    if (selectedRole === 'admin') {
      return `Tetapkan ${name} sebagai Admin/Bendahara?`;
    }
    if (selectedRole === 'super_admin') {
      return `Tetapkan ${name} sebagai Super Admin?`;
    }
    return `Tetapkan ${name} sebagai Jamaah?`;
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        title="Ubah Role Pengguna"
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg font-medium transition-all shadow-xs"
      >
        <Shield className="w-3.5 h-3.5 text-emerald-600" />
        <span>Ubah Role</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ubah Role Pengguna</h3>
                  <p className="text-xs text-slate-500">Kelola hak akses dan peran operasional</p>
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

            {/* User Info Card */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-sm space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Nama:</span>
                <span className="font-semibold text-slate-900 capitalize">{user.full_name || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">WhatsApp:</span>
                <span className="font-mono text-xs text-slate-700">{user.phone || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                <span className="text-xs text-slate-500 font-medium">Role Saat Ini:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-800">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>

            {/* Confirmation Mode */}
            {isConfirming ? (
              <div className="space-y-4 py-2">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Konfirmasi Perubahan Role</h4>
                  <p className="text-sm text-slate-700 font-semibold">{getConfirmationText()}</p>
                  <p className="text-xs text-slate-500">
                    Tindakan ini akan dicatat ke dalam audit log sistem bersama rincian akun Anda.
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
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Menyimpan...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Ya, Konfirmasi</span>
                      </>
                    )}
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
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-slate-900">Jamaah</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
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
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-slate-900">Admin/Bendahara</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
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
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-bold text-slate-900">Super Admin</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Akses penuh level tertinggi. Dapat menetapkan Admin/Bendahara, mengubah role pengguna, unduh backup data, dan pengaturan sistem.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={selectedRole === user.role}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Lanjutkan
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
