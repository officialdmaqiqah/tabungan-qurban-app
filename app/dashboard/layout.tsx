import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home, Send, Package, HelpCircle, Video, LayoutDashboard, Clock, XCircle } from 'lucide-react';
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav';
import { isAdminOrSuperAdmin } from '@/lib/roles';

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
    .select('full_name, role, phone, approval_status, approval_note')
    .eq('id', user.id)
    .single();

  const isAdminOrSuper = isAdminOrSuperAdmin(profile?.role, user.user_metadata?.role, profile?.phone);

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
            <span className="font-medium">Tabungan</span>
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
          {isAdminOrSuper && (
            <div className="pt-4 mt-4 border-t border-slate-200">
              <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl transition-all">
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Panel Admin</span>
              </Link>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        {!isAdminOrSuper && profile?.approval_status === 'pending' && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-sm leading-relaxed">
              <p className="font-bold">Akun Anda sedang menunggu persetujuan admin.</p>
              <p className="text-amber-800/90">Anda sudah bisa melihat dan memilih paket qurban. Laporan setoran bisa dikirim setelah akun disetujui. Kami akan mengabari Anda lewat WhatsApp.</p>
            </div>
          </div>
        )}
        {!isAdminOrSuper && profile?.approval_status === 'rejected' && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div className="text-sm leading-relaxed">
              <p className="font-bold">Pendaftaran Anda belum dapat disetujui.</p>
              {profile?.approval_note && <p className="text-red-800/90">Catatan admin: {profile.approval_note}</p>}
              <p className="text-red-800/90">Silakan hubungi admin MAKT untuk informasi lebih lanjut.</p>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <DashboardMobileNav isAdminOrSuper={Boolean(isAdminOrSuper)} />
    </div>
  );
}
