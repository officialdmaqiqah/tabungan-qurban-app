'use client';

import { useState } from 'react';
import { KeyRound, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordButton({ userId, resetAction }: { userId: string, resetAction: (formData: FormData) => Promise<{success: boolean, error?: string}> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('newPassword', newPassword);
    
    const result = await resetAction(formData);
    
    if (result.success) {
      toast.success('Password berhasil direset!');
      setSuccess(true);
    } else {
      toast.error(result.error || 'Gagal mereset password');
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => { setIsOpen(true); setSuccess(false); setNewPassword(''); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-xs"
      >
        <KeyRound className="w-3.5 h-3.5" />
        Reset Password
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                Reset Password Jamaah
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {success ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Password Berhasil Diubah!</h4>
                    <p className="text-sm text-slate-500 mt-1">Silakan copy password baru di bawah ini dan berikan kepada jamaah melalui WhatsApp.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-lg font-semibold text-slate-800 tracking-wider">
                    {newPassword}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-lg hover:bg-emerald-700 transition-colors mt-4"
                  >
                    Selesai
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
                    <input 
                      type="text" 
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru (min. 6 karakter)"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Sistem akan memaksa penggantian password akun jamaah ini. Pastikan Anda menghubungi jamaah untuk memberikan password barunya.
                  </p>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading || newPassword.length < 6}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {loading ? 'Memproses...' : 'Simpan Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
