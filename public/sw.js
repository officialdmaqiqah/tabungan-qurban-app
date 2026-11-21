// Service Worker Tabungan Qurban MAKT
//
// Prinsip:
// - Data pribadi/keuangan (dashboard, admin, API, Supabase) TIDAK PERNAH disimpan di HP.
// - Halaman (HTML) selalu diambil dari jaringan; bila offline tampil /offline.html.
// - File tampilan statis (JS/CSS/font/gambar) disimpan agar cepat, dengan batas jumlah
//   sehingga file dari versi lama terhapus otomatis.
//
// Naikkan VERSION setiap kali isi PRECACHE_ASSETS berubah (mis. ikon diganti).
const VERSION = 'v4';
const PRECACHE = `makt-precache-${VERSION}`;
const RUNTIME = 'makt-runtime';
const RUNTIME_MAX_ENTRIES = 80;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/logo-dark.png',
  '/logo-white.png',
];

// Install: simpan aset inti (termasuk halaman offline), lalu langsung aktif
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => console.warn('[SW] Precache warning:', err))
      .then(() => self.skipWaiting())
  );
});

// Activate: hapus semua cache selain versi aktif (termasuk makt-pwa-v1/v2 lama)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== PRECACHE && name !== RUNTIME)
            .map((name) => {
              console.log('[SW] Menghapus cache lama:', name);
              return caches.delete(name);
            })
        )
      )
      .then(() => trimCache(RUNTIME, RUNTIME_MAX_ENTRIES))
      .then(() => self.clients.claim())
  );
});

// Hapus entri tertua bila cache melebihi batas (urutan keys() = urutan penyimpanan)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

async function putInRuntime(request, response) {
  const cache = await caches.open(RUNTIME);
  // Hapus dulu supaya entri yang diperbarui pindah ke posisi "terbaru"
  await cache.delete(request);
  await cache.put(request, response);
  await trimCache(RUNTIME, RUNTIME_MAX_ENTRIES);
}

async function offlineResponse() {
  const cached = await caches.match(OFFLINE_URL);
  return (
    cached ||
    new Response('<h1>Tidak ada koneksi internet</h1><p>Silakan periksa koneksi Anda lalu coba lagi.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1. Navigasi halaman: selalu dari jaringan; bila gagal tampilkan halaman offline.
  //    Berlaku juga untuk dashboard/admin, tanpa pernah menyimpan isi halamannya.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => offlineResponse()));
    return;
  }

  // 2. Data pribadi/dinamis: jaringan saja, jangan disentuh cache
  const isPrivateOrDynamic =
    !sameOrigin ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/qris') ||
    url.searchParams.has('token') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1';
  if (isPrivateOrDynamic) return;

  // 3. Aset inti (precache): ambil dari cache, perbarui dari jaringan bila tersedia
  if (PRECACHE_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  // 4. File tampilan statis: cache dulu, perbarui di latar belakang (stale-while-revalidate)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/.test(url.pathname);

  if (isStaticAsset) {
    const network = fetch(request).then(async (response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        await putInRuntime(request, response.clone());
      }
      return response;
    });
    // Pastikan penyimpanan di latar belakang selesai walau respons sudah dikirim dari cache
    event.waitUntil(network.catch(() => {}));
    event.respondWith(
      caches.match(request, { cacheName: RUNTIME }).then(
        (cached) => cached || network.catch(() => Response.error())
      )
    );
  }
  // Selain itu: biarkan browser menangani seperti biasa (jaringan)
});
