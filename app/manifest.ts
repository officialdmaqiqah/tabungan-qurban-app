import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tabungan Qurban MAKT',
    short_name: 'Qurban MAKT',
    description: 'Fasilitas Tabungan Qurban Masjid Agung Kubah Timah Pangkalpinang',
    id: '/login',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#065f46',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['finance', 'productivity'],
    // Pratinjau di jendela install (Android/Chrome). Ganti file di public/screenshots bila tampilan berubah.
    screenshots: [
      {
        src: '/screenshots/beranda-hp.webp',
        sizes: '780x1688',
        type: 'image/webp',
        form_factor: 'narrow',
        label: 'Beranda Tabungan Qurban MAKT dengan kalkulator target qurban',
      },
      {
        src: '/screenshots/masuk-hp.webp',
        sizes: '780x1688',
        type: 'image/webp',
        form_factor: 'narrow',
        label: 'Masuk dengan nomor WhatsApp dan PIN 6 angka',
      },
      {
        src: '/screenshots/daftar-hp.webp',
        sizes: '780x1688',
        type: 'image/webp',
        form_factor: 'narrow',
        label: 'Daftar tabungan qurban dengan verifikasi WhatsApp',
      },
      {
        src: '/screenshots/beranda-desktop.webp',
        sizes: '1280x800',
        type: 'image/webp',
        form_factor: 'wide',
        label: 'Beranda Tabungan Qurban MAKT di komputer',
      },
    ],
  };
}
