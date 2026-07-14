import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home, Send, Package, HelpCircle, Video } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:block w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6">
          <img src="/logo-dark.png" alt="Logo Masjid Agung Kubah Timah" className="h-14 w-auto mb-4" />
          <p className="text-sm text-slate-500 mt-1">Halo, {profile?.full_name?.split(' ')[0]}</p>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all">
            <Home className="w-5 h-5" />
            <span className="font-medium">Buku Tabungan</span>
          </Link>
          <Link href="/dashboard/paket" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all">
            <Package className="w-5 h-5" />
            <span className="font-medium">Pilih Paket</span>
          </Link>
          <Link href="/dashboard/lapor" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all">
            <Send className="w-5 h-5" />
            <span className="font-medium">Lapor Setoran</span>
          </Link>
          <Link href="/dashboard/tutorial" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all">
            <Video className="w-5 h-5" />
            <span className="font-medium">Video Tutorial</span>
          </Link>
          <form action="/auth/signout" method="post" className="w-full">
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-left whitespace-nowrap">
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </form>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-40">
        <nav className="flex justify-around items-center h-16">
          <Link href="/dashboard" className="flex flex-col items-center justify-center w-full h-full text-slate-600 hover:text-emerald-600">
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Buku Tabungan</span>
          </Link>
          <Link href="/dashboard/paket" className="flex flex-col items-center justify-center w-full h-full text-slate-600 hover:text-emerald-600">
            <Package className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Paket</span>
          </Link>
          <Link href="/dashboard/lapor" className="flex flex-col items-center justify-center w-full h-full text-slate-600 hover:text-emerald-600">
            <Send className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Lapor</span>
          </Link>
          <Link href="/dashboard/tutorial" className="flex flex-col items-center justify-center w-full h-full text-slate-600 hover:text-emerald-600">
            <Video className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Tutorial</span>
          </Link>
          <form action="/auth/signout" method="post" className="w-full h-full">
            <button type="submit" className="flex flex-col items-center justify-center w-full h-full text-red-500 hover:text-red-600">
              <LogOut className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Keluar</span>
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
