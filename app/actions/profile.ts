'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getRecentlyRegisteredUser } from '@/lib/auth-guards';

/**
 * Melengkapi profil (kategori & gender) tepat setelah pendaftaran.
 * Dipanggil sebelum pengguna login, jadi:
 * - hanya untuk akun yang baru dibuat (lihat REGISTRATION_WINDOW_MS);
 * - nilai diambil dari data pendaftaran akun itu sendiri (metadata signUp),
 *   bukan dari parameter client, sehingga tidak bisa dipakai untuk mengubah
 *   profil orang lain.
 * Parameter `_kategoriJamaah` dan `_gender` dipertahankan agar pemanggil lama tetap kompatibel.
 */
export async function updateProfileAfterRegistration(
  userId: string,
  _kategoriJamaah?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  _gender?: string // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const newUser = await getRecentlyRegisteredUser(userId);
  if (!newUser) {
    throw new Error('Akun tidak valid untuk melengkapi profil pendaftaran.');
  }

  const meta = newUser.user_metadata || {};
  const kategoriJamaah = typeof meta.kategori_jamaah === 'string' ? meta.kategori_jamaah : null;
  const gender = typeof meta.gender === 'string' ? meta.gender : null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      kategori_jamaah: kategoriJamaah,
      gender: gender,
      is_anonymous: false
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update profile after registration:', error);
    throw error;
  }
}
