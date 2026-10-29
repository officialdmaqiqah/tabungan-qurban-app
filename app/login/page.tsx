'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatWhatsAppNumber } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fallback client-side check if user already has an active session
  useEffect(() => {
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || session.user.user_metadata?.role === 'super_admin';
        router.replace(isAdmin ? '/admin' : '/dashboard');
      }
    }
    checkExistingSession();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!phone || !password) {
      toast.error('Harap isi No. WhatsApp dan password.');
      setLoading(false);
      return;
    }

    const { formatted: validPhone, error: phoneError } = formatWhatsAppNumber(phone);
    if (phoneError || !validPhone) {
      toast.error(phoneError || 'Format nomor tidak valid.');
      setLoading(false);
      return;
    }

    try {
      const dummyEmail = `${validPhone}@qurban.makt.id`;
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: password,
      });

      if (signInError) throw signInError;

      // Cek role user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const isAdminUser = profileData?.role === 'admin' || profileData?.role === 'super_admin' || data.user.user_metadata?.role === 'super_admin';

      if (isAdminUser) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      
    } catch (err: any) {
      toast.error(err.message || 'Nomor WhatsApp atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      <div className="w-full max-w-[440px] sm:max-w-[460px] bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 box-border">
        {/* Card Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-emerald-100/60 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">Masuk Akun</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
            Selamat datang kembali! Lanjutkan niat baik Anda.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-4.5">
          {/* No. WhatsApp Field */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              No. WhatsApp
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
            disabled={loading}
            className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk</span>
            )}
          </button>
        </form>

        {/* Card Footer: Daftar Link */}
        <p className="text-center text-xs sm:text-sm text-slate-500 mt-6">
          Belum punya akun?{' '}
          <Link href="/register" className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline transition-colors">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
