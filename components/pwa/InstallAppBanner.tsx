'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  Download, 
  X, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Smartphone, 
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

const DISMISS_STORAGE_KEY = 'makt_pwa_banner_dismissed_at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export default function InstallAppBanner() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSChrome, setIsIOSChrome] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Modals state
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Cek apakah berjalan dalam mode standalone (sudah terpasang)
    const isStandalone = 
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && (navigator as any).standalone === true) ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

    if (isStandalone) {
      return;
    }

    // 2. Cek apakah pernah di-dismiss dalam 7 hari terakhir
    try {
      const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedAt) {
        const diff = Date.now() - parseInt(dismissedAt, 10);
        if (diff < DISMISS_DURATION_MS) {
          return;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // 3. Deteksi tipe perangkat & OS mobile
    const ua = navigator.userAgent || '';
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const androidDevice = /Android/i.test(ua);
    const mobileDevice = iosDevice || androidDevice || /Mobi|Mobile/i.test(ua);

    // Hanya tampil di browser mobile
    if (!mobileDevice) {
      return;
    }

    setIsIOS(iosDevice);
    setIsIOSChrome(iosDevice && /CriOS/i.test(ua));
    setIsAndroid(androidDevice);
    setIsVisible(true);

    // 4. Tangkap event beforeinstallprompt untuk Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    // 5. Tangkap event appinstalled
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      toast.success('Alhamdulillah, aplikasi Tabungan Qurban MAKT berhasil dipasang!');
      try {
        localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
      } catch (e) {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Jangan tampilkan di halaman Admin
  if (!mounted || !isVisible || pathname?.startsWith('/admin')) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    } catch (e) {}
  };

  const handleActionClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          toast.success('Memasang aplikasi Tabungan Qurban MAKT...');
          setIsVisible(false);
          try {
            localStorage.setItem(DISMISS_STORAGE_KEY, (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
          } catch (e) {}
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowAndroidModal(true);
      }
    } else {
      setShowAndroidModal(true);
    }
  };

  // Posisi safe: Jika di dashboard jamaah, ada bottom navigation bar (h-16 = 64px)
  const isDashboard = pathname?.startsWith('/dashboard');
  const bottomPositionClass = isDashboard 
    ? 'bottom-[76px] sm:bottom-4' 
    : 'bottom-3 sm:bottom-4';

  return (
    <>
      {/* Install Floating Banner */}
      <div 
        className={`fixed ${bottomPositionClass} left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 bg-white/95 backdrop-blur-md border border-emerald-100 rounded-2xl shadow-xl p-3.5 sm:p-4 text-slate-900 animate-in slide-in-from-bottom-5 duration-300 box-border`}
        role="region"
        aria-label="Install Aplikasi Tabungan Qurban"
      >
        <div className="flex items-start gap-3">
          {/* Logo / Icon */}
          <div className="w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center p-2 shrink-0 shadow-sm">
            <img 
              src="/logo-white.png" 
              alt="Logo MAKT" 
              className="w-full h-full object-contain"
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">
                Install Tabungan Qurban
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-lg transition-colors"
                aria-label="Tutup banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              Akses cepat langsung dari layar HP Anda.
            </p>

            {/* Action Buttons */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleActionClick}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'Pasang di iPhone' : 'Install Sekarang'}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Petunjuk iOS / iPhone */}
      <Modal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
        title="Pasang di Layar Utama iPhone"
        description="Aplikasi Tabungan Qurban MAKT dapat diakses seperti aplikasi biasa tanpa download dari App Store."
        icon={<Smartphone className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-700"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-600">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-emerald-900 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs leading-relaxed font-medium">
              Ikuti 3 langkah mudah berikut untuk menambahkan icon ke Home Screen iPhone Anda:
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 mb-0.5">
                  Ketuk Tombol Bagikan (Share)
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isIOSChrome ? (
                    <>Ketuk tombol menu titik tiga (•••) atau tombol <strong>Bagikan</strong> di browser.</>
                  ) : (
                    <>Ketuk ikon <strong>Bagikan (Share)</strong> <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]"><Share className="w-3 h-3 inline mr-1" /> Kotak bertanda panah ke atas</span> pada bilah navigasi bawah Safari.</>
                  )}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 mb-0.5">
                  Pilih &quot;Tambah ke Layar Utama&quot;
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Gulir ke bawah pada menu yang muncul dan pilih opsi <strong className="text-slate-800">&quot;Add to Home Screen&quot;</strong> atau <strong className="text-slate-800">&quot;Tambah ke Layar Utama&quot;</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 ml-0.5" />.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 mb-0.5">
                  Ketuk &quot;Tambah&quot; (Add)
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ketuk tombol <strong>Tambah</strong> di pojok kanan atas. Ikon aplikasi Tabungan Qurban MAKT akan langsung muncul di layar utama iPhone Anda!
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition-colors text-center text-xs sm:text-sm cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Petunjuk Android Manual */}
      <Modal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
        title="Pasang di HP Android"
        description="Panduan jika tombol otomatis tidak muncul di browser Anda."
        icon={<Smartphone className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-700"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-600">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 mb-0.5">
                  Buka Menu Browser
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ketuk ikon menu titik tiga (<MoreVertical className="w-3.5 h-3.5 inline text-slate-700" />) di pojok kanan atas Google Chrome.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 mb-0.5">
                  Pilih &quot;Install Aplikasi&quot;
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pilih menu <strong>&quot;Install aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (Add to Home screen).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 mb-0.5">
                  Konfirmasi Pemasangan
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ketuk <strong>Install</strong> untuk menambahkan ikon Tabungan Qurban MAKT ke beranda HP Anda.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAndroidModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-center text-xs sm:text-sm cursor-pointer"
            >
              Tutup Petunjuk
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
