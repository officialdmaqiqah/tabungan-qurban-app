'use client';

import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header({ user, role }: { user: any, role: string }) {
  const pathname = usePathname();

  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <img src="/logo-dark.png" alt="Logo Masjid Agung Kubah Timah" className="h-10 w-auto" />
          <div className="hidden sm:flex flex-col justify-center">
            <span className="font-black text-xl text-emerald-700 leading-none tracking-tight">Tabungan Qurban</span>
            <span className="text-[11px] font-medium text-slate-500 italic mt-0.5">Sisihkan Sekarang, Tunaikan Qurban Kemudian</span>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {user ? (
            <Link 
              href={role === 'admin' ? "/admin" : "/dashboard"} 
              className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full hover:bg-emerald-200 transition-all font-semibold"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
                Masuk
              </Link>
              <Link 
                href="/register" 
                className="bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md font-semibold"
              >
                Daftar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
