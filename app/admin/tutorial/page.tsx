import { Video } from 'lucide-react';

export default function AdminTutorialPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Video Tutorial</h1>
            <p className="text-slate-500 text-sm">Panduan penggunaan aplikasi Tabungan Qurban untuk Admin</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">1. Tutorial Pendaftaran Akun</h3>
            <p className="text-sm text-slate-600">Panduan cara mendaftar dan membuat akun jamaah baru di aplikasi Tabungan Qurban.</p>
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">2. Tutorial Lapor Setoran</h3>
            <p className="text-sm text-slate-600">Langkah-langkah melaporkan bukti transfer setoran qurban jamaah ke panitia.</p>
          </div>
        </div>

        {/* Video 3 */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
          <div className="aspect-video w-full relative">
            <iframe 
              className="w-full h-full absolute top-0 left-0"
              src="https://www.youtube.com/embed/HIgrop9mAWY" 
              title="Tutorial Penggunaan Dashboard Admin" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">3. Tutorial Khusus Admin</h3>
            <p className="text-sm text-slate-600">Panduan untuk admin dalam memvalidasi setoran dan mengelola data jamaah.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
