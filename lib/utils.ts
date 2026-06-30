
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateDaysLeft(targetDateStr: string) {
  const dateOnly = targetDateStr.split('T')[0];
  const target = new Date(`${dateOnly}T00:00:00+07:00`);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

export function formatWhatsAppNumber(phone: string): { formatted: string | null; error: string | null } {
  if (!phone) return { formatted: null, error: 'Nomor WhatsApp tidak boleh kosong.' };
  
  // Validasi karakter yang diizinkan di input awal (hanya angka, spasi, strip, dan + di awal)
  if (!/^\+?[\d\s\-]+$/.test(phone)) {
    return { formatted: null, error: 'Nomor WhatsApp hanya boleh berisi angka dan tanda plus (+).' };
  }

  // Hanya ambil angka dan tanda + untuk proses
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (!cleaned) return { formatted: null, error: 'Nomor WhatsApp tidak valid.' };

  // Buang tanda + untuk pengecekan awalan
  let normalized = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;

  // Normalisasi kode negara Indonesia (62)
  if (normalized.startsWith('08')) {
    normalized = '628' + normalized.substring(2);
  } else if (normalized.startsWith('8')) {
    normalized = '628' + normalized.substring(1);
  }

  // Pastikan dimulai dengan 62
  if (!normalized.startsWith('62')) {
    return { formatted: null, error: 'Nomor WhatsApp harus nomor Indonesia (dimulai dengan 08 atau 62).' };
  }

  // Cek panjang karakter (misal minimal 10 digit, maksimal 15 digit termasuk 62)
  if (normalized.length < 10 || normalized.length > 15) {
    return { formatted: null, error: 'Panjang nomor WhatsApp harus antara 10 hingga 15 digit.' };
  }

  return { formatted: normalized, error: null };
}

export function maskName(name: string) {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed[0] + '*';
  return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

export function getProgressBadge(progressPercent: number) {
  if (progressPercent >= 100) return { label: '🏆 Alhamdulillah Tercapai!', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (progressPercent >= 75) return { label: '⚡ Sedikit Lagi, Pasti Bisa!', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (progressPercent >= 50) return { label: '🏔️ Separuh Jalan, Jangan Nyerah!', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
  if (progressPercent >= 26) return { label: '🛤️ Istiqomah, Terus Bertahan!', color: 'bg-violet-100 text-violet-700 border-violet-200' };
  if (progressPercent >= 1) return { label: '👣 Langkah Awal, Semangat!', color: 'bg-sky-100 text-sky-700 border-sky-200' };
  return { label: '🌱 Bismillah Mulai', color: 'bg-slate-100 text-slate-700 border-slate-200' };
}
