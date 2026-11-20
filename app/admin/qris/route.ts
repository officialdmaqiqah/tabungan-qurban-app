import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/auth-guards';
import { getQrisSetting, QRIS_BUCKET } from '@/lib/qris';
import { revalidatePath } from 'next/cache';

const MAX_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// Admin mengunggah/mengganti gambar QRIS resmi.
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Akses ditolak: hanya admin.' }, { status: 403 });

  let file: FormDataEntryValue | null = null;
  try {
    const form = await request.formData();
    file = form.get('file');
  } catch {
    return NextResponse.json({ error: 'Data unggahan tidak valid.' }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Pilih file gambar QRIS terlebih dahulu.' }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: 'Format harus PNG, JPG, atau WEBP.' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Ukuran file maksimal 3 MB.' }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: settings, error: settingsError } = await adminClient
    .from('program_settings')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (settingsError || !settings) {
    return NextResponse.json(
      { error: 'Pengaturan program belum ada atau migrasi 20261121000000_qris_setting.sql belum dijalankan.' },
      { status: 500 }
    );
  }

  const previous = await getQrisSetting();
  const path = `qris/qris-${Date.now()}.${ext}`;
  const { error: uploadError } = await adminClient.storage
    .from(QRIS_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error('QRIS upload failed:', uploadError);
    return NextResponse.json(
      { error: 'Gagal mengunggah. Pastikan migrasi 20261121000000_qris_setting.sql sudah dijalankan.' },
      { status: 500 }
    );
  }

  const { error: updateError } = await adminClient
    .from('program_settings')
    .update({ qris_image_path: path, qris_updated_at: new Date().toISOString() })
    .eq('id', settings.id);
  if (updateError) {
    await adminClient.storage.from(QRIS_BUCKET).remove([path]);
    console.error('QRIS setting update failed:', updateError);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan QRIS.' }, { status: 500 });
  }

  if (previous?.path && previous.path !== path) {
    await adminClient.storage.from(QRIS_BUCKET).remove([previous.path]);
  }

  await adminClient.from('audit_logs').insert({
    admin_id: admin.id,
    action: 'ubah QRIS',
    target_id: null,
    details: previous ? 'Mengganti gambar QRIS setoran' : 'Mengunggah gambar QRIS setoran',
    created_at: new Date().toISOString(),
  });

  revalidatePath('/', 'layout');
  return NextResponse.json({ success: true });
}
