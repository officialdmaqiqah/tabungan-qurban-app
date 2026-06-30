'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toTitleCase, formatWhatsAppNumber } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ShieldCheck, UserPlus, MapPin, Package as PackageIcon } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get('packageId');
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [kategoriJamaah, setKategoriJamaah] = useState('');
  const [gender, setGender] = useState('');

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validasi sederhana
    if (!phone || !password || !fullName || !gender || !kategoriJamaah) {
      toast.error('Harap isi semua field yang wajib.');
      setLoading(false);
      return;
    }

    if (!selectedRegency || !selectedDistrict || !selectedVillage) {
      toast.error('Harap isi lengkap alamat (Kabupaten, Kecamatan, Kelurahan).');
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
      
      const regencyName = regencies.find(r => r.id === selectedRegency)?.name || '';
      const districtName = districts.find(d => d.id === selectedDistrict)?.name || '';
      const villageName = villages.find(v => v.id === selectedVillage)?.name || '';
      
      let fullAddress = detailAddress;
      if (selectedRegency && selectedDistrict && selectedVillage) {
        fullAddress = `${detailAddress ? detailAddress + ', ' : ''}Kel. ${villageName}, Kec. ${districtName}, ${regencyName}, Kepulauan Bangka Belitung`;
      }
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: dummyEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: validPhone,
            address: fullAddress,
            role: 'jamaah',
            kategori_jamaah: kategoriJamaah,
            gender: gender,
            is_active: true
          }
        }
      });

      if (signUpError) throw signUpError;

      // Assign package if packageId exists
      if (packageId && data?.user) {
        // We wait a short time to ensure profile is created via trigger before inserting package
        await new Promise(resolve => setTimeout(resolve, 500));
        await supabase.from('user_packages').insert({
          user_id: data.user.id,
          package_id: packageId,
          quantity: 1
        });
      }

      toast.success('Pendaftaran berhasil! Silakan masuk ke akun Anda.');
      router.push('/login');
      
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mendaftar');
    } finally {
      setLoading(false);
    }
  };

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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
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
                  type="text" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="0812..."
                />
                <p className="text-xs text-slate-500 mt-1">Digunakan untuk masuk ke akun dan pengingat.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password *</label>
                <input 
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Minimal 6 karakter"
                />
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white disabled:opacity-50"
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white disabled:opacity-50"
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none bg-white"
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
              {loading ? 'Memproses...' : 'Daftar & Lanjutkan'}
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
