'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 bg-white mt-auto">
      <p>&copy; {new Date().getFullYear()} Masjid Agung Kubah Timah Pangkalpinang. All rights reserved.</p>
    </footer>
  );
}
