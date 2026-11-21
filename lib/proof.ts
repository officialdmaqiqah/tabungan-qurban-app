// Server-only: mengubah nilai proof_url transaksi menjadi link yang aman dibuka.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedProof {
  /** Link yang aman dibuka (signed URL dari storage kita), atau null. */
  url: string | null;
  /** true bila proof_url berisi sesuatu yang bukan file bukti transfer dari aplikasi ini. */
  invalid: boolean;
}

// Format yang dibuat aplikasi ini:
//   proofs/<uuid pemilik>/<nama-file>          (diunggah jamaah lewat Lapor Setoran)
//   transfer_proofs/transfers/<nama-file>      (diunggah admin lewat Input Transaksi)
const JAMAAH_PROOF_RE = /^proofs\/([0-9a-f-]{36})\/[^/]+$/i;
const ADMIN_PROOF_RE = /^transfer_proofs\/transfers\/[^/]+$/;

/**
 * KEAMANAN: proof_url diisi dari HP jamaah saat lapor setoran. Jangan pernah
 * menampilkannya mentah-mentah sebagai link, karena bisa berisi alamat situs
 * lain (mis. halaman login palsu) yang lalu diklik admin.
 */
export async function resolveProofUrl(
  supabase: SupabaseClient,
  proofUrl: string | null | undefined,
  ownerId?: string | null
): Promise<ResolvedProof> {
  if (!proofUrl) return { url: null, invalid: false };

  // Data lama yang menyimpan URL lengkap: hanya boleh dari storage Supabase kita sendiri
  if (/^https?:\/\//i.test(proofUrl)) {
    try {
      const own = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
      const target = new URL(proofUrl);
      if (target.origin === own.origin && target.pathname.startsWith('/storage/v1/object/')) {
        return { url: target.toString(), invalid: false };
      }
    } catch {
      /* URL tidak valid */
    }
    return { url: null, invalid: true };
  }

  if (proofUrl.includes('..')) return { url: null, invalid: true };

  let bucket: string;
  const jamaahMatch = proofUrl.match(JAMAAH_PROOF_RE);
  if (jamaahMatch) {
    // Bukti jamaah wajib berada di folder milik pemilik transaksi
    if (ownerId && jamaahMatch[1].toLowerCase() !== ownerId.toLowerCase()) return { url: null, invalid: true };
    bucket = 'proofs';
  } else if (ADMIN_PROOF_RE.test(proofUrl)) {
    bucket = 'transfer_proofs';
  } else {
    return { url: null, invalid: true };
  }

  const path = proofUrl.slice(bucket.length + 1);
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return { url: data?.signedUrl ?? null, invalid: false };
}
