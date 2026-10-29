'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Send, Video, LogOut, LayoutDashboard } from 'lucide-react';

interface DashboardMobileNavProps {
  isAdminOrSuper: boolean;
}

export default function DashboardMobileNav({ isAdminOrSuper }: DashboardMobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Tabungan',
      href: '/dashboard',
      icon: Home,
      isActive: pathname === '/dashboard',
    },
    {
      label: 'Paket',
      href: '/dashboard/paket',
      icon: Package,
      isActive: pathname === '/dashboard/paket',
    },
    {
      label: 'Lapor',
      href: '/dashboard/lapor',
      icon: Send,
      isActive: pathname === '/dashboard/lapor',
    },
    {
      label: 'Tutorial',
      href: '/dashboard/tutorial',
      icon: Video,
      isActive: pathname === '/dashboard/tutorial',
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] z-40 pb-safe overflow-hidden">
      <nav className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-w-0 h-full flex flex-col items-center justify-center py-1 px-0.5 text-center transition-colors group ${
                item.isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 mb-1 transition-transform group-active:scale-95 ${
                    item.isActive ? 'text-emerald-600 stroke-[2.25]' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] sm:text-[11px] leading-tight tracking-tight text-center w-full truncate whitespace-nowrap block px-0.5 ${
                  item.isActive ? 'font-bold text-emerald-700' : 'font-medium text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Tombol Keluar */}
        <form action="/auth/signout" method="post" className="flex-1 min-w-0 h-full flex items-center justify-center m-0 p-0">
          <button
            type="submit"
            className="w-full h-full flex flex-col items-center justify-center py-1 px-0.5 text-center text-slate-500 hover:text-red-600 transition-colors group cursor-pointer focus:outline-none"
          >
            <div className="relative flex items-center justify-center">
              <LogOut className="w-5 h-5 mb-1 text-slate-400 group-hover:text-red-500 transition-transform group-active:scale-95" />
            </div>
            <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight text-center w-full truncate whitespace-nowrap block px-0.5 font-medium text-slate-500 group-hover:text-red-600">
              Keluar
            </span>
          </button>
        </form>

        {/* Panel Admin: HANYA tampil jika user memiliki role admin/bendahara atau super_admin */}
        {isAdminOrSuper && (
          <Link
            href="/admin"
            className={`flex-1 min-w-0 h-full flex flex-col items-center justify-center py-1 px-0.5 text-center transition-colors group ${
              pathname.startsWith('/admin') ? 'text-emerald-700 font-bold' : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 mb-1 text-emerald-600 group-hover:text-emerald-700 transition-transform group-active:scale-95" />
            </div>
            <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight text-center w-full truncate whitespace-nowrap block px-0.5 font-semibold text-emerald-700">
              Admin
            </span>
          </Link>
        )}
      </nav>
    </div>
  );
}
