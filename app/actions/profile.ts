'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function updateProfileAfterRegistration(userId: string, kategoriJamaah: string, gender: string) {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('profiles')
    .update({
      kategori_jamaah: kategoriJamaah,
      gender: gender
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update profile after registration:', error);
    throw error;
  }
}
