import { Video } from 'lucide-react';

export default function JamaahTutorialPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Video Tutorial</h1>
            <p className="text-slate-500 text-sm">Panduan penggunaan aplikasi Tabungan Qurban</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Video 1 */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
          <div className="aspect-video w-full relative">
            <iframe 
              className="w-full h-full absolute top-0 left-0"
              src="https://www.youtube.com/embed/rfI7Df8nV9o" 
              title="Tutorial Pendaftaran Akun Tabungan Qurban MAKT" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">1. Mukadimah Tabungan Qurban</h3>
            <p className="text-sm text-slate-600">Mukadimah tentang tabungan qurban.</p>
          </div>
        </div>

        {/* Video 2 */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
          <div className="aspect-video w-full relative">
            <iframe 
              className="w-full h-full absolute top-0 left-0"
              src="https://www.youtube.com/embed/7BtPwIPnfCg" 
              title="Tutorial Lapor Setoran Tabungan Qurban MAKT" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">2. Tutorial Untuk Jamaah</h3>
            <p className="text-sm text-slate-600">Tutorial buat jamaah mulai dari daftar, setor, kirim laporan, pantau.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
