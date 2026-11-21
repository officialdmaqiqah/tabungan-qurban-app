'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { QrCode, Upload, Loader2, Download } from 'lucide-react';

export default function QrisUploadCard({ version, canEdit = false }: { version: string | null; canEdit?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onPick = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Pilih file gambar QRIS terlebih dahulu.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Format harus PNG, JPG, atau WEBP.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 3 MB.');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/admin/qris', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Gagal mengunggah QRIS.');
        return;
      }
      toast.success('QRIS berhasil disimpan dan sudah tampil untuk jamaah.');
      onPick(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      toast.error('Gagal mengunggah QRIS. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const currentSrc = version ? `/qris?v=${encodeURIComponent(version)}` : null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">QRIS Setoran</h2>
          <p className="text-sm text-slate-500">
            Gambar QRIS resmi yang ditampilkan di halaman depan, dashboard jamaah, dan halaman Lapor Setoran. Jamaah juga bisa
            mengunduhnya kapan saja.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-[200px_1fr] gap-5 items-start">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 flex items-center justify-center min-h-[200px]">
          {preview || currentSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview || currentSrc!} alt="Pratinjau QRIS" className="max-h-[260px] w-auto rounded-lg bg-white" />
          ) : (
            <span className="text-xs text-slate-400 text-center">Belum ada QRIS</span>
          )}
        </div>

        <div className="space-y-3">
          {!canEdit && (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Hanya Super Admin yang dapat mengganti QRIS.
            </p>
          )}
          {preview && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Pratinjau file baru, belum disimpan. Pastikan nama merchant dan NMID sudah benar sebelum menyimpan.
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
            disabled={loading || !canEdit}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
          />
          <p className="text-xs text-slate-500">Format PNG/JPG/WEBP, maksimal 3 MB. Gunakan file QRIS asli dari bank, bukan foto/screenshot yang buram.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading || !file || !canEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {version ? 'Ganti QRIS' : 'Simpan QRIS'}
            </button>
            {currentSrc && (
              <a
                href={`/qris?download=1&v=${encodeURIComponent(version!)}`}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
