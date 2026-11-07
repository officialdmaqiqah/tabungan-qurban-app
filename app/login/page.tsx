'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatWhatsAppNumber } from '@/lib/utils';
import { requestLoginOtp, verifyLoginOtp } from '@/app/actions/auth_otp';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  KeyRound,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // Active Method Tab: 'otp' (Default) | 'password' (Legacy)
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');

  // Shared Phone Input state (persists across tab switches)
  const [phone, setPhone] = useState('');

  // Password Login state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // WhatsApp OTP Login state
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpRequesting, setIsOtpRequesting] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Fallback client-side check if user already has an active session
  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        const isAdmin =
          profile?.role === 'admin' ||
          profile?.role === 'super_admin' ||
          session.user.user_metadata?.role === 'super_admin';
        router.replace(isAdmin ? '/admin' : '/dashboard');
      }
    }
    checkExistingSession();
  }, [router, supabase]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Handler: Request WhatsApp OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOtpError(null);

    if (!phone.trim()) {
      setOtpError('Harap masukkan nomor WhatsApp Anda.');
      return;
    }

    setIsOtpRequesting(true);

    try {
      const res = await requestLoginOtp(phone);
      if (res.success) {
        setOtpStep('code');
        setOtpCooldown(res.cooldownSeconds || 60);
        toast.success(res.message || 'Kode OTP berhasil dikirim ke WhatsApp Anda.');
      } else {
        setOtpError(res.error || 'Gagal mengirimkan kode OTP.');
        if (res.cooldownSeconds) {
          setOtpCooldown(res.cooldownSeconds);
        }
      }
    } catch {
      setOtpError('Terjadi kendala jaringan saat meminta kode OTP.');
    } finally {
      setIsOtpRequesting(false);
    }
  };

  // Handler: Verify WhatsApp OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const cleanToken = otpCode.replace(/\D/g, '');
    if (cleanToken.length !== 6) {
      setOtpError('Masukkan tepat 6 digit kode OTP.');
      return;
    }

    setIsOtpVerifying(true);

    try {
      const res = await verifyLoginOtp(phone, cleanToken);
      if (res.success) {
        toast.success(res.message || 'Alhamdulillah, login berhasil!');
        // Full window navigation guarantees cookies set by Server Action are applied by browser
        window.location.href = res.redirectUrl || '/dashboard';
      } else {
        setOtpError(res.error || 'Kode OTP tidak sesuai atau telah kadaluarsa.');
      }
    } catch {
      setOtpError('Terjadi kendala jaringan saat memverifikasi kode OTP.');
    } finally {
      setIsOtpVerifying(false);
    }
  };

  // Handler: Legacy Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordLoading(true);

    if (!phone || !password) {
      toast.error('Harap isi No. WhatsApp / Email dan password.');
      setIsPasswordLoading(false);
      return;
    }

    const trimmedInput = phone.trim();
    let loginEmail = '';

    if (trimmedInput.includes('@')) {
      loginEmail = trimmedInput.toLowerCase();
    } else {
      const { formatted: validPhone, error: phoneError } = formatWhatsAppNumber(trimmedInput);
      if (phoneError || !validPhone) {
        toast.error(phoneError || 'Format nomor tidak valid.');
        setIsPasswordLoading(false);
        return;
      }
      loginEmail = `${validPhone}@qurban.makt.id`;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (signInError) throw signInError;

      // Check user role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const isAdminUser =
        profileData?.role === 'admin' ||
        profileData?.role === 'super_admin' ||
        data.user.user_metadata?.role === 'super_admin';

      if (isAdminUser) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Nomor WhatsApp / Email atau password salah');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      <div className="w-full max-w-[440px] sm:max-w-[460px] bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 box-border">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-emerald-100/60 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">Masuk Akun</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
            Selamat datang kembali! Lanjutkan niat baik tabungan qurban Anda.
          </p>
        </div>

        {/* Dual Method Segmented Tabs */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl mb-6 border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setActiveTab('otp');
              setOtpError(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'otp'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            WhatsApp OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setOtpError(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Password
          </button>
        </div>

        {/* TAB 1: WHATSAPP OTP */}
        {activeTab === 'otp' && (
          <div>
            {otpError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {/* STEP 1: INPUT NOMOR */}
            {otpStep === 'phone' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    No. WhatsApp Aktif
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    name="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-[52px] min-w-0 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 text-base opacity-100 rounded-xl px-4 outline-none transition-all box-border"
                    placeholder="Contoh: 08123456789"
                    autoFocus
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Format yang didukung: 08..., 628..., atau +628...
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Sistem akan mengirimkan 6 digit kode OTP resmi langsung ke WhatsApp Anda untuk verifikasi identitas.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isOtpRequesting || otpCooldown > 0}
                  className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 cursor-pointer"
                >
                  {isOtpRequesting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Mengirim OTP...</span>
                    </>
                  ) : otpCooldown > 0 ? (
                    <span>Tunggu {otpCooldown} detik</span>
                  ) : (
                    <>
                      <span>Kirim Kode OTP WhatsApp</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: INPUT 6 DIGIT OTP */}
            {otpStep === 'code' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-xs text-slate-500">Kode OTP 6 digit telah dikirim ke:</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{phone}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2 text-center">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-[56px] text-center tracking-[0.4em] sm:tracking-[0.5em] text-2xl font-black bg-white text-slate-900 placeholder:text-slate-300 caret-emerald-700 border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none transition-all box-border"
                    placeholder="••••••"
                    autoFocus
                  />
                  <p className="mt-1.5 text-[11px] text-center text-slate-400">
                    Kode berlaku selama 5 menit
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('phone');
                      setOtpCode('');
                      setOtpError(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
                  >
                    ← Ubah Nomor
                  </button>
                  <button
                    type="button"
                    disabled={otpCooldown > 0 || isOtpRequesting}
                    onClick={() => handleRequestOtp()}
                    className="text-emerald-600 font-semibold hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {otpCooldown > 0 ? `Kirim ulang (${otpCooldown}s)` : 'Kirim Ulang OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isOtpVerifying || otpCode.length !== 6}
                  className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 cursor-pointer"
                >
                  {isOtpVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <span>Masuk ke Tabungan Qurban</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: PASSWORD LEGACY */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4 sm:space-y-4.5">
            {/* No. WhatsApp / Email Field */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                No. WhatsApp / Email
              </label>
              <input
                type="text"
                autoComplete="username"
                name="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-[52px] min-w-0 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 text-base opacity-100 rounded-xl px-4 outline-none transition-all box-border"
                placeholder="Contoh: 08123456789 atau nama@email.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  Password
                </label>
                <a
                  href="https://wa.me/6287791134515?text=Assalamu'alaikum%20Admin,%20saya%20kesulitan%20login%20ke%20akun%20Tabungan%20Qurban%20saya.%20Mohon%20bantuannya%20untuk%20reset%20password."
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors"
                >
                  Lupa password?
                </a>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[52px] min-w-0 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 border border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 text-base opacity-100 rounded-xl pl-4 pr-12 outline-none transition-all box-border"
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 rounded-lg transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={isPasswordLoading}
              className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {isPasswordLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>
          </form>
        )}

        {/* Card Footer: Daftar Link */}
        <p className="text-center text-xs sm:text-sm text-slate-500 mt-6">
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline transition-colors"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
