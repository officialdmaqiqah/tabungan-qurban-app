import type { NextConfig } from "next";

// Header keamanan untuk semua halaman.
const securityHeaders = [
  // Situs tidak boleh dimuat di dalam iframe situs lain (mencegah clickjacking pada halaman admin/jamaah)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Browser tidak boleh menebak jenis file (mencegah file unggahan dijalankan sebagai skrip)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Alamat lengkap halaman (bisa berisi data) tidak dikirim ke situs lain
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Fitur perangkat yang tidak dipakai aplikasi dimatikan
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Selalu pakai HTTPS
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
