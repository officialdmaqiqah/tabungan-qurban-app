'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatWhatsAppNumber } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');



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

      if (profileData?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      
    } catch (err: any) {
      toast.error(err.message || 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Masuk Akun</h2>
          <p className="text-sm text-slate-500 mt-2">Selamat datang kembali! Lanjutkan niat baik Anda.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">No. WhatsApp</label>
            <input 
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Contoh: 08123456789"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <a 
                href="https://wa.me/6287791134515?text=Assalamu'alaikum%20Admin,%20saya%20kesulitan%20login%20ke%20akun%20Tabungan%20Qurban%20saya.%20Mohon%20bantuannya%20untuk%20reset%20password." 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-emerald-600 font-medium hover:underline"
              >
                Lupa password?
              </a>
            </div>
            <input 
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          Belum punya akun? <Link href="/register" className="text-emerald-600 font-semibold hover:underline">Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
}
