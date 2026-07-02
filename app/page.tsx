import Link from "next/link";
import { 
  ArrowRight, 
  ShieldCheck, 
  Wallet, 
  Heart, 
  PiggyBank, 
  Target, 
  CheckCircle2, 
  ArrowUpRight, 
  Package, 
  AlertCircle, 
  Sparkles, 
  Users, 
  Calendar,
  MessageSquare,
  Lock,
  TrendingUp,
  Eye
} from "lucide-react";
import FAQ from "@/components/FAQ";
import HeroCalculator from "@/components/HeroCalculator";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { formatCurrency } from "@/lib/utils";
import PhoneMockup from "@/components/PhoneMockup";

export default async function Home() {
  const supabase = await createClient();
  
  // Use service role to bypass RLS for public stats
  const serviceSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Fetch active packages (using standard client is fine if public RLS is enabled, but service role is safer)
  const { data: packages } = await serviceSupabase
    .from('qurban_packages')
    .select('*')
    .order('price', { ascending: true });

  // Fetch program settings
  const { data: settings } = await serviceSupabase
    .from('program_settings')
    .select('qurban_date')
    .single();

  // Fetch total verified amount
  const { data: totalVerifiedTx } = await serviceSupabase
    .from('transactions')
    .select('amount')
    .eq('status', 'verified');
  const totalFundsCollected = totalVerifiedTx?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

  // Fetch total jamaah count
  const { count: totalJamaahCount } = await serviceSupabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'jamaah');

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-800">
      
      {/* ================= SECTION 1: HERO SECTION (ABOVE THE FOLD) ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white pt-10 lg:pt-12 pb-24 lg:pb-36">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[150px] opacity-35"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[500px] h-[500px] bg-teal-500 rounded-full blur-[150px] opacity-35"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
            
            {/* Hero Text */}
            <div className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-800/45 border border-emerald-700/50 backdrop-blur-md text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Tabungan Qurban MAKT
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15]">
                Wujudkan Niat Qurban Terbaik <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200">
                  Tanpa Terasa Berat
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed max-w-xl">
                Niat suci berqurban kini lebih mudah diraih. Tabung dana qurban Anda secara fleksibel tanpa batas minimum setor. Amanah, terpercaya, dan tercatat otomatis langsung dari HP Anda.
              </p>
              
              {/* CTA Buttons Removed */}

              {/* Mini Stats / Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-emerald-800/50 max-w-lg">
                <div className="text-left">
                  <div className="text-2xl font-extrabold text-amber-400">100%</div>
                  <div className="text-xs text-emerald-200/80">Transparansi Dana</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-extrabold text-amber-400">Syariah</div>
                  <div className="text-xs text-emerald-200/80">Sesuai Akad Qurban</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-extrabold text-amber-400">Mudah</div>
                  <div className="text-xs text-emerald-200/80">Setoran Fleksibel</div>
                </div>
              </div>
            </div>

            {/* Hero Visual (Interactive Calculator) */}
            <div className="lg:col-span-5 flex justify-center">
              <HeroCalculator packages={packages} qurbanDate={settings?.qurban_date} />
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 2: VALIDASI MASALAH (THE PAIN POINT) ================= */}
      <section className="py-24 bg-white relative z-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-3">Mengapa Banyak Orang Menunda Berqurban?</h2>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              Apakah Masalah Ini Yang Membuat Anda Sulit Berqurban Setiap Tahun?
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Pain Point 1 */}
            <div className="bg-rose-50/40 border border-rose-100 rounded-3xl p-8 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Terasa Berat Sekaligus</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Mengeluarkan uang sebesar <span className="font-semibold text-rose-700">Rp 3.500.000+ sekaligus</span> saat mendekati hari raya Idul Adha terasa sangat memberatkan pengeluaran rumah tangga.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-rose-50/40 border border-rose-100 rounded-3xl p-8 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tabungan Sering Bocor</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Niat menabung sendiri di rumah atau di rekening biasa sering gagal karena uangnya <span className="font-semibold text-rose-700">terpakai tanpa sadar</span> untuk kebutuhan mendadak lainnya.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-rose-50/40 border border-rose-100 rounded-3xl p-8 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Kurang Pantauan & Ragu</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Khawatir menyetorkan uang cicilan karena <span className="font-semibold text-rose-700">pencatatan manual yang tidak transparan</span> dan sulit memantau sudah berapa saldo yang terkumpul.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2.5: APP PREVIEW (MOCKUP) ================= */}
      <section className="py-24 bg-emerald-950 relative overflow-hidden border-t border-emerald-900/50">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-800/50 border border-emerald-700/50 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Aplikasi Dalam Genggaman
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Pantau Tabungan Qurban Anda Kapan Saja, Dari Mana Saja.
              </h2>
              <p className="text-emerald-100/80 leading-relaxed text-lg max-w-lg mx-auto lg:mx-0">
                Kami hadirkan solusi untuk semua kendala Anda. Dengan aplikasi Tabungan Qurban MAKT, niat berqurban kini bisa dicicil bertahap dengan pantauan mutlak di tangan Anda.
              </p>
              
              <ul className="space-y-4 pt-4 text-emerald-50 text-left max-w-md mx-auto lg:mx-0">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <span><strong>Ringan:</strong> Bebas setor berapapun tanpa batas minimum. Berqurban tak lagi terasa berat.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <span><strong>Aman:</strong> Dana langsung terkunci di rekening qurban masjid, anti bocor terpakai hal lain.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <span><strong>Transparan:</strong> Saldo dan riwayat terekam otomatis, pantau progress 100% dari HP Anda.</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-center lg:justify-end relative">
              <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full"></div>
              {/* Note: The image uploaded by user will be saved as /app-mockup.jpg */}
              <PhoneMockup imageSrc="/app-mockup.jpg" altText="Tampilan Aplikasi Tabungan Qurban" />
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 3: PRESENTASI SOLUSI & FITUR (THE SOLUTION) ================= */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest">Solusi Terbaik Untuk Anda</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                Tabungan Qurban MAKT Menjadikan Qurban Terencana & Terwujud
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Platform digital resmi Masjid Agung Kubah Timah dirancang khusus membantu jamaah merencanakan ibadah qurban secara bertahap, aman, dan disiplin.
              </p>
              
              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-all shadow-md hover:shadow-lg text-sm"
                >
                  Mulai Menabung Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Setoran Sangat Fleksibel</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bebas setor nominal berapa saja, kapan saja (harian, mingguan, bulanan) tanpa ada paksaan potongan saldo.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Verifikasi & Transparansi 100%</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Setiap transaksi diverifikasi admin, riwayat tercatat rapi di dasbor akun, dan Anda mendapat notifikasi otomatis.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Kalkulator Target Pintar</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sistem otomatis menghitung sisa target dana yang harus dicapai berdasarkan paket qurban pilihan Anda.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Pengurusan Hewan Amanah</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pembelian, pemeliharaan, hingga pemotongan hewan kurban ditangani langsung oleh panitia profesional masjid.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 4: BUKTI SOSIAL (SOCIAL PROOF) & TRANSPARANSI PREVIEW ================= */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-3">Bukti Nyata & Transparansi</h2>
            <p className="text-3xl sm:text-4xl font-bold text-slate-900">
              Kisah Sukses & Laporan Transparansi Dana Terkumpul
            </p>
          </div>

          {/* Realtime Stats Banner */}
          <div className="max-w-5xl mx-auto bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-8 md:p-10 shadow-lg border border-emerald-800 mb-16 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-800/50 rounded-full border border-emerald-700/50 text-xs font-medium text-emerald-200">
                <TrendingUp className="w-3.5 h-3.5" /> Live Data Tabungan Qurban
              </div>
              <h3 className="text-2xl font-bold">Gerakan Kebaikan Terus Bertumbuh</h3>
              <p className="text-sm text-emerald-100/80">
                Laporan dana masuk dan jumlah partisipan jamaah yang terverifikasi saat ini.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 shrink-0">
              <div className="text-center bg-white/5 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10 min-w-[150px]">
                <span className="text-xs text-emerald-200/80 uppercase tracking-wider block mb-1">Dana Terkumpul</span>
                <span className="text-2xl md:text-3xl font-black text-amber-400">{formatCurrency(totalFundsCollected)}</span>
              </div>
              <div className="text-center bg-white/5 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10 min-w-[150px]">
                <span className="text-xs text-emerald-200/80 uppercase tracking-wider block mb-1">Jamaah Terdaftar</span>
                <span className="text-2xl md:text-3xl font-black text-amber-400">{totalJamaahCount || 0} Orang</span>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {/* Testimonial 1 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative space-y-4 flex flex-col justify-between">
              <p className="text-slate-600 text-sm leading-relaxed italic">
                "Tahun-tahun sebelumnya saya sering batal qurban karena tabungan selalu kepakai buat kebutuhan lain. Sejak pakai sistem cicilan masjid ini, saya bisa konsisten menyisihkan Rp 10.000 sehari dan akhirnya bisa berqurban sapi kelompok."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-sm shrink-0">
                  H
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">H. Hermawan</h4>
                  <p className="text-xs text-slate-500">Jamaah Kategori Umum</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative space-y-4 flex flex-col justify-between">
              <p className="text-slate-600 text-sm leading-relaxed italic">
                "Sangat terbantu! Sistemnya sangat transparan, setiap kali saya kirim bukti transfer setoran, langsung divalidasi dan jumlah tabungan di halaman akun saya bertambah. Jadi tenang karena tercatat resmi."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-sm shrink-0">
                  R
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Rina Handayani</h4>
                  <p className="text-xs text-slate-500">Ibu Rumah Tangga</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative space-y-4 flex flex-col justify-between">
              <p className="text-slate-600 text-sm leading-relaxed italic">
                "Sebagai remaja masjid, rasanya senang sekali bisa ikut qurban kambing dari hasil menyisihkan uang jajan bulanan. Platform ini membuat kami anak muda jadi lebih termotivasi untuk belajar berqurban sejak dini."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-sm shrink-0">
                  F
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Fahri</h4>
                  <p className="text-xs text-slate-500">Remaja/Pemuda Masjid</p>
                </div>
              </div>
            </div>
          </div>

          {/* Link to Transparency Page */}
          <div className="text-center">
            <Link
              href="/transparansi"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 md:px-8 md:py-4 w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-full font-extrabold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5 text-sm md:text-base"
            >
              <Eye className="w-5 h-5 text-emerald-100 shrink-0" /> 
              <span>Lihat Laporan Transparansi <span className="hidden sm:inline">Seluruh Jamaah</span></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= SECTION 5: PENAWARAN & PAKET HARGA (THE OFFER) ================= */}
      <section className="py-24 bg-slate-50" id="paket">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-3">Pilihan Investasi Akhirat</h2>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Paket Rencana Qurban Terbaik</h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Pilih paket rencana qurban Anda hari ini. Mulai mencicil secara fleksibel demi menyempurnakan ibadah Anda.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
            {packages?.map((pkg) => (
              <div key={pkg.id} className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.33rem)] max-w-md bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-emerald-500 transition-all duration-300 group flex flex-col">
                <div className="p-8 pb-6 bg-white border-b border-slate-100 flex-1">
                  <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-4">Amanah & Syariah</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{pkg.name}</h3>
                  
                  <div className="pt-2 pb-4">
                    <span className="text-xs text-slate-400 block mb-1">Setoran Rencana Mulai Dari</span>
                    <div className="text-3xl font-black text-slate-950">
                      {formatCurrency(pkg.price)}
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold mt-1 block bg-emerald-50 inline-block px-2 py-0.5 rounded-md">
                      Setara ± Rp {Math.round(pkg.price / 365).toLocaleString('id-ID')}/hari selama setahun
                    </span>
                  </div>

                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed min-h-[60px]">{pkg.description}</p>
                </div>
                <div className="p-6 bg-slate-50/50 mt-auto">
                  <Link 
                    href={`/register?packageId=${pkg.id}`}
                    className="w-full py-3.5 px-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
                  >
                    Pilih Paket & Mulai Nabung <ArrowUpRight className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 6: PEMBALIK RISIKO (RISK REVERSAL) & URGENSI ================= */}
      <section className="py-20 bg-emerald-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
        
        <div className="container mx-auto px-4 relative z-10 max-w-4xl">
          <div className="bg-emerald-900/40 border border-emerald-800/60 rounded-3xl p-8 md:p-12 shadow-xl backdrop-blur-md">
            <div className="grid md:grid-cols-12 gap-8 items-center">
              
              {/* Guarantee */}
              <div className="md:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  Jaminan Keamanan & Akad Garansi
                </div>
                <h3 className="text-2xl font-bold leading-tight">Uang Tabungan Aman & Dapat Ditarik Kembali</h3>
                <p className="text-sm text-emerald-200/95 leading-relaxed">
                  Jika terjadi keadaan darurat (halangan syar'i) di tengah jalan sehingga Anda tidak bisa melanjutkan tabungan, dana yang sudah masuk **dijamin 100% aman dan dapat ditarik kembali** atau dialihkan untuk periode berikutnya.
                </p>
              </div>

              {/* Urgency */}
              <div className="md:col-span-5 bg-emerald-950/60 p-6 rounded-2xl border border-emerald-800/40 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5" />
                  Kuota Periode Ini Terbatas
                </div>
                <p className="text-xs text-emerald-100/90">
                  Pendaftaran kelompok hewan qurban kolektif (Sapi 1/7) akan segera dikunci begitu kuota per kelompok terpenuhi.
                </p>
                <div className="pt-2">
                  <Link
                    href="/register"
                    className="block w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition-all shadow-md text-sm"
                  >
                    Amankan Kuota Anda Sekarang
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 7: PERTANYAAN UMUM (FAQ) ================= */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-3">Tanya Jawab</h2>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Informasi Tambahan</h2>
            <p className="text-slate-600 text-sm sm:text-base">Jawaban atas keraguan umum seputar program tabungan qurban.</p>
          </div>
          <FAQ />
        </div>
      </section>

      {/* ================= SECTION 8: TOMBOL PENUTUP (FINAL CTA) ================= */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/80 text-center">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mb-2">
            <Heart className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Niat Baik Berqurban, <br />
            Wujudkan Langkah Nyatanya Hari Ini
          </h2>
          <p className="text-slate-600 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            Hanya butuh 2 menit untuk membuka akun tabungan. Buat rencana ibadah Anda berjalan dengan disiplin dan berkah.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4 max-w-xl mx-auto">
            <Link
              href="/register"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-all shadow-lg shadow-emerald-600/20 text-base whitespace-nowrap"
            >
              Mulai Daftar Akun Gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full font-semibold transition-all text-base whitespace-nowrap"
            >
              Masuk Ke Dasbor Anda
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
