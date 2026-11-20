'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/utils';
import { requestPinResetOtp, resetPinWithOtp } from '@/app/actions/auth';

const inputClass =
  'w-full h-[52px] min-w-0 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 text-base rounded-xl px-4 outline-none transition-all box-border';

export default function LupaPinPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (target: string) => {
    const res = await requestPinResetOtp(target);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success(res.message || 'Kode verifikasi sudah dikirim ke WhatsApp Anda.');
    setResendIn(60);
    return true;
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const { formatted, error } = formatWhatsAppNumber(phone);
    if (error || !formatted) {
      toast.error(error || 'Format nomor tidak valid.');
      return;
    }
    setLoading(true);
    try {
      if (await sendCode(formatted)) {
        setNormalizedPhone(formatted);
        setStep('verify');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setLoading(true);
    try {
      await sendCode(normalizedPhone);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Kode verifikasi harus 6 digit angka.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error('PIN harus 6 digit angka.');
      return;
    }
    if (pin !== pinConfirm) {
      toast.error('Konfirmasi PIN tidak sama.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPinWithOtp(normalizedPhone, otp, pin);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message || 'PIN berhasil disimpan.');
      router.push(res.redirectTo || '/login');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      <div className="w-full max-w-[440px] sm:max-w-[460px] bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 box-border">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-emerald-100/60">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">Buat / Atur Ulang PIN</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
            {step === 'phone'
              ? 'Masukkan nomor WhatsApp yang terdaftar. Kami akan mengirim kode verifikasi.'
              : <>Masukkan kode yang dikirim ke <span className="font-semibold text-slate-700">+{normalizedPhone}</span>, lalu buat PIN baru.</>}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">No. WhatsApp</label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="Contoh: 08123456789"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Mengirim...</span></>) : <span>Kirim Kode WhatsApp</span>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Kode verifikasi (6 angka)</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputClass} text-center text-xl font-bold tracking-[0.5em]`}
                placeholder="••••••"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">PIN baru</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} tracking-[0.3em]`}
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Ulangi PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} tracking-[0.3em]`}
                  placeholder="••••••"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-1">Hindari PIN mudah ditebak seperti 123456 atau 111111.</p>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Menyimpan...</span></>) : <span>Simpan PIN & Masuk</span>}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep('phone')}
                disabled={loading}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Ganti nomor
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resendIn > 0}
                className="text-emerald-600 font-semibold hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                {resendIn > 0 ? `Kirim ulang (${resendIn} dtk)` : 'Kirim ulang kode'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs sm:text-sm text-slate-500 mt-6">
          Ingat PIN Anda?{' '}
          <Link href="/login" className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
