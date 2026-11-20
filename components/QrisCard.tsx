import Link from 'next/link';
import { Download, QrCode, BadgeCheck } from 'lucide-react';

/**
 * Kartu QRIS resmi untuk setoran tabungan.
 * Tidak menampilkan apa pun bila admin belum mengunggah QRIS (version = null).
 */
export default function QrisCard({
  version,
  compact = false,
  showLaporLink = true,
}: {
  version: string | null | undefined;
  /** Tampilan ringkas (mis. di halaman Lapor Setoran). */
  compact?: boolean;
  showLaporLink?: boolean;
}) {
  if (!version) return null;
  const imgSrc = `/qris?v=${encodeURIComponent(version)}`;
  const downloadHref = `/qris?download=1&v=${encodeURIComponent(version)}`;

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
      <div className={`grid ${compact ? 'sm:grid-cols-[180px_1fr]' : 'md:grid-cols-[260px_1fr]'} gap-0`}>
        {/* Gambar QRIS */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-5 flex flex-col items-center justify-center gap-3 border-b sm:border-b-0 sm:border-r border-emerald-100">
          <a href={imgSrc} target="_blank" rel="noopener noreferrer" title="Buka QRIS ukuran penuh">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt="QRIS resmi Tabungan Qurban MAKT PKP"
              className={`${compact ? 'w-40' : 'w-52 md:w-56'} h-auto rounded-xl border border-white shadow-md bg-white`}
              loading="lazy"
            />
          </a>
          <a
            href={downloadHref}
            download
            className="inline-flex items-center justify-center gap-2 w-full max-w-[220px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download QRIS
          </a>
        </div>

        {/* Penjelasan */}
        <div className={`${compact ? 'p-4 md:p-5' : 'p-5 md:p-7'} space-y-3`}>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700">
              <QrCode className="w-4 h-4" />
            </span>
            <h3 className={`${compact ? 'text-base' : 'text-lg md:text-xl'} font-bold text-slate-900`}>
              Setor Lebih Mudah dengan QRIS
            </h3>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Bayar dari aplikasi <span className="font-semibold">m-banking atau dompet digital apa pun</span>. Dana langsung masuk ke
            rekening resmi <span className="font-semibold">Qurban MAKT PKP di Bank Sumsel Babel Syariah</span>,{' '}
            <span className="font-semibold text-emerald-700">tanpa biaya transfer antarbank</span>.
          </p>

          <ol className="space-y-2 text-sm text-slate-700">
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
              <span>Tekan tombol <span className="font-semibold">Download QRIS</span>, lalu simpan gambarnya di galeri HP (cukup sekali).</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
              <span>Buka aplikasi berlogo QRIS (m-banking bank mana pun, DANA, OVO, GoPay, ShopeePay, dll.), pilih <span className="font-semibold">Scan QRIS</span>, lalu <span className="font-semibold">ambil gambar dari galeri</span>.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">3</span>
              <span>Pastikan nama penerima <span className="font-semibold">QURBAN MAKT PKP</span>, ketik nominal setoran, lalu bayar.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">4</span>
              <span>Simpan bukti pembayaran, lalu kirim lewat menu <span className="font-semibold">Lapor Setoran</span> (pilih <span className="font-semibold">Transfer / QRIS</span>).</span>
            </li>
          </ol>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              QRIS resmi, standar Bank Indonesia
            </span>
            {showLaporLink && (
              <Link href="/dashboard/lapor" className="text-sm font-semibold text-emerald-700 hover:underline">
                Sudah bayar? Lapor setoran →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
