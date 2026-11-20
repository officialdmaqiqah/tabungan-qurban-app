'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toTitleCase, formatWhatsAppNumber } from '@/lib/utils';
import { requestRegistrationOtp, completeRegistration } from '@/app/actions/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ShieldCheck, MapPin, Package as PackageIcon, MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get('packageId');
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [kategoriJamaah, setKategoriJamaah] = useState('');
  const [gender, setGender] = useState('');
  const [waOptIn, setWaOptIn] = useState(false);

  // Region states
  const [regencies, setRegencies] = useState<{id: string, name: string}[]>([]);
  const [districts, setDistricts] = useState<{id: string, name: string}[]>([]);
  const [villages, setVillages] = useState<{id: string, name: string}[]>([]);

  const [selectedRegency, setSelectedRegency] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [detailAddress, setDetailAddress] = useState('');

  // Fetch Regencies on mount
  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/regencies/19.json')
      .then(res => res.json())
      .then(data => setRegencies(data.map((item: any) => ({ ...item, name: toTitleCase(item.name) }))))
      .catch(console.error);
  }, []);

  // Fetch Districts when Regency changes
  useEffect(() => {
    if (!selectedRegency) {
      setDistricts([]);
      setSelectedDistrict('');
      return;
    }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedRegency}.json`)
      .then(res => res.json())
      .then(data => setDistricts(data.map((item: any) => ({ ...item, name: toTitleCase(item.name) }))))
      .catch(console.error);
  }, [selectedRegency]);

  // Fetch Villages when District changes
  useEffect(() => {
    if (!selectedDistrict) {
      setVillages([]);
      setSelectedVillage('');
      return;
    }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedDistrict}.json`)
      .then(res => res.json())
      .then(data => setVillages(data.map((item: any) => ({ ...item, name: toTitleCase(item.name) }))))
      .catch(console.error);
  }, [selectedDistrict]);

  // Hitung mundur tombol "Kirim ulang kode"
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const buildAddress = () => {
    const regencyName = regencies.find(r => r.id === selectedRegency)?.name || '';
    const districtName = districts.find(d => d.id === selectedDistrict)?.name || '';
    const villageName = villages.find(v => v.id === selectedVillage)?.name || '';
    if (selectedRegency && selectedDistrict && selectedVillage) {
      return `${detailAddress ? detailAddress + ', ' : ''}Kel. ${villageName}, Kec. ${districtName}, ${regencyName}, Kepulauan Bangka Belitung`;
    }
    return detailAddress;
  };

  const sendOtp = async (phoneToUse: string) => {
    const res = await requestRegistrationOtp(phoneToUse);
    if (!res.success) {
      toast.error(res.error);
      return false;
    }
    toast.success(res.message || 'Kode verifikasi sudah dikirim ke WhatsApp Anda.');
    setResendIn(60);
    return true;
  };

  // Langkah 1: validasi formulir lalu kirim kode OTP ke WhatsApp
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !pin || !pinConfirm || !fullName || !gender || !kategoriJamaah) {
      toast.error('Harap isi semua field yang wajib.');
      return;
    }
    if (!selectedRegency || !selectedDistrict || !selectedVillage) {
      toast.error('Harap isi lengkap alamat (Kabupaten, Kecamatan, Kelurahan).');
      return;
    }
    const { formatted: validPhone, error: phoneError } = formatWhatsAppNumber(phone);
    if (phoneError || !validPhone) {
      toast.error(phoneError || 'Format nomor tidak valid.');
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
      if (await sendOtp(validPhone)) {
        setNormalizedPhone(validPhone);
        setOtp('');
        setStep('otp');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || !normalizedPhone) return;
    setLoading(true);
    try {
      await sendOtp(normalizedPhone);
    } finally {
      setLoading(false);
    }
  };

  // Langkah 2: verifikasi kode lalu buat akun
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Kode verifikasi harus 6 digit angka.');
      return;
    }
    setLoading(true);
    try {
      const res = await completeRegistration({
        fullName: toTitleCase(fullName.trim()),
        phone: normalizedPhone,
        pin,
        kategoriJamaah,
        gender,
        address: buildAddress(),
        waOptIn,
        packageId,
        otp,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message || 'Pendaftaran berhasil!');
      router.push(res.redirectTo || '/login');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat mendaftar');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="w-full max-w-[440px] bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-emerald-100/60">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verifikasi WhatsApp</h1>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Masukkan kode 6 angka yang kami kirim ke WhatsApp <span className="font-semibold text-slate-700">+{normalizedPhone}</span>.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
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
              className="w-full h-[56px] bg-white text-slate-900 placeholder:text-slate-300 caret-emerald-700 border border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 text-center text-2xl font-bold tracking-[0.5em] rounded-xl px-4 outline-none transition-all"
              placeholder="••••••"
            />

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Memproses...</span></>) : <span>Verifikasi & Buat Akun</span>}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={loading}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Ubah data
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

          <p className="text-xs text-slate-400 mt-5 text-center leading-relaxed">
            Kode tidak masuk? Pastikan nomor aktif di WhatsApp. Kode berlaku 10 menit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img src="/logo-dark.png" alt="Logo Masjid Agung Kubah Timah" className="h-24 md:h-28 w-auto" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Mulai Niat Qurban</h2>
          <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">Isi data diri Anda di bawah ini untuk bergabung dan memulai tabungan qurban.</p>
        </div>

        {packageId && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
            <PackageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">Anda telah memilih paket qurban. Selesaikan pendaftaran untuk mengonfirmasi pilihan Anda.</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            {/* Left Column: Personal Info */}
            <div className="p-8 md:p-10 space-y-6 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-900">Data Pribadi & Login</h3>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap *</label>
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  placeholder="Sesuai KTP"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori *</label>
                  <select 
                    required
                    value={kategoriJamaah}
                    onChange={(e) => setKategoriJamaah(e.target.value)}
                    className="w-full px-4 py-3 bg-white text-slate-900 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  >
                    <option value="">Pilih</option>
                    <option value="Pengurus Masjid">Pengurus Masjid</option>
                    <option value="Remaja/Pemuda Masjid">Remaja/Pemuda Masjid</option>
                    <option value="Jamaah Masjid">Jamaah Masjid</option>
                    <option value="Masyarakat Umum">Masyarakat Umum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender *</label>
                  <select 
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 bg-white text-slate-900 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  >
                    <option value="">Pilih</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">No. WhatsApp *</label>
                <input 
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  name="phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  placeholder="0812..."
                />
                <p className="text-xs text-slate-500 mt-1">Kode verifikasi akan dikirim ke nomor ini lewat WhatsApp.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">PIN (6 angka) *</label>
                  <input 
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 text-base tracking-[0.3em] border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                    placeholder="••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ulangi PIN *</label>
                  <input 
                    name="pinConfirm"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 caret-emerald-700 text-base tracking-[0.3em] border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                    placeholder="••••••"
                  />
                </div>
                <p className="col-span-2 text-xs text-slate-500 -mt-2">PIN dipakai untuk masuk. Hindari angka mudah ditebak seperti 123456 atau 111111.</p>
              </div>

              <div className="flex items-start gap-3 mt-4">
                <div className="flex items-center h-5">
                  <input
                    id="waOptIn"
                    type="checkbox"
                    checked={waOptIn}
                    onChange={(e) => setWaOptIn(e.target.checked)}
                    className="w-4 h-4 border border-slate-300 rounded bg-slate-50 focus:ring-3 focus:ring-emerald-300"
                  />
                </div>
                <label htmlFor="waOptIn" className="text-sm font-medium text-slate-700">
                  Saya bersedia menerima notifikasi Tabungan Qurban MAKT melalui WhatsApp.
                </label>
              </div>
            </div>

            {/* Right Column: Address */}
            <div className="p-8 md:p-10 space-y-6 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-900">Alamat Tempat Tinggal</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Kabupaten/Kota *</label>
                <select 
                  required
                  value={selectedRegency}
                  onChange={(e) => setSelectedRegency(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all bg-white text-slate-900 text-base"
                >
                  <option value="">Pilih Kabupaten/Kota (Babel)</option>
                  {regencies.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Kecamatan *</label>
                <select 
                  required
                  disabled={!selectedRegency}
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all bg-white text-slate-900 text-base disabled:opacity-50"
                >
                  <option value="">Pilih Kecamatan</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Kelurahan/Desa *</label>
                <select 
                  required
                  disabled={!selectedDistrict}
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all bg-white text-slate-900 text-base disabled:opacity-50"
                >
                  <option value="">Pilih Kelurahan/Desa</option>
                  {villages.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Detail Alamat Lengkap</label>
                <textarea 
                  rows={3}
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all resize-none bg-white text-slate-900 text-base placeholder:text-slate-400 caret-emerald-700"
                  placeholder="Nama jalan, gang, RT/RW, nomor rumah..."
                ></textarea>
              </div>
            </div>
          </div>
          
          <div className="p-8 md:px-10 md:py-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600 order-2 md:order-1">
              Sudah punya akun? <Link href="/login" className="text-emerald-600 font-bold hover:underline">Masuk di sini</Link>
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 order-1 md:order-2"
            >
              {loading ? 'Mengirim kode...' : 'Daftar & Kirim Kode WA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
