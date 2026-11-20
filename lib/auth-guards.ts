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
