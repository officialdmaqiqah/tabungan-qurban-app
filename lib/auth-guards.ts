// Server-only helper untuk memeriksa hak akses di dalam server action.
// Server action bisa dipanggil langsung lewat POST, jadi setiap aksi
// wajib memeriksa login/role sendiri (lihat Next.js data-security guide).
import 'server-only';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isAdminOrSuperAdmin } from '@/lib/roles';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/** Mengembalikan user jika login sebagai admin/super_admin (berdasarkan profiles.role), selain itu null. */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return isAdminOrSuperAdmin(profile?.role) ? user : null;
}

/** Batas nominal satu kali input setoran/penarikan tunai oleh admin (Rp 100 juta). */
export const MAX_CASH_AMOUNT = 100_000_000;

/** Mengembalikan pesan error bila nominal tidak wajar, selain itu null. */
export function validateCashAmount(value: unknown): string | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Nominal harus berupa angka bulat.';
  if (n <= 0) return 'Nominal harus lebih dari 0.';
  if (n > MAX_CASH_AMOUNT) return 'Nominal terlalu besar (maksimal Rp 100.000.000 per transaksi).';
  return null;
}
