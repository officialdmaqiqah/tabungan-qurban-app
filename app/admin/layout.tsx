import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Settings, Users, CheckSquare, Package, PlusCircle, Activity, FileText } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="hidden md:block w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          <p className="text-sm text-slate-400 mt-1">Halo, {profile?.full_name?.split(' ')[0]}</p>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/admin/paket" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <Package className="w-5 h-5" />
            <span className="font-medium">Manajemen Paket</span>
          </Link>
          <Link href="/admin/jamaah" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <Users className="w-5 h-5" />
            <span className="font-medium">Data Jamaah</span>
          </Link>
          <Link href="/admin/input-setoran" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium">Input Setoran</span>
          </Link>
          <Link href="/admin/verifikasi" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <CheckSquare className="w-5 h-5" />
            <span className="font-medium">Verifikasi Setoran</span>
          </Link>
          <Link href="/admin/riwayat-transaksi" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <FileText className="w-5 h-5" />
            <span className="font-medium">Semua Transaksi</span>
          </Link>
          <Link href="/admin/pengaturan" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Pengaturan</span>
          </Link>
          <Link href="/admin/audit-log" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Log Aktivitas</span>
          </Link>
          <form action="/auth/signout" method="post" className="w-full mt-auto pt-8">
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-md transition-colors text-left whitespace-nowrap">
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </form>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.3)] z-40">
        <nav className="flex justify-around items-center h-16">
          <Link href="/admin" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-white">
            <LayoutDashboard className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </Link>
          <Link href="/admin/paket" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-white">
            <Package className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Paket</span>
          </Link>
          <form action="/auth/signout" method="post" className="w-full h-full">
            <button type="submit" className="flex flex-col items-center justify-center w-full h-full text-red-400 hover:text-red-300">
              <LogOut className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Keluar</span>
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
