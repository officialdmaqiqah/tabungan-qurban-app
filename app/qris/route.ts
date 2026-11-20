import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQrisSetting, QRIS_BUCKET } from '@/lib/qris';

// Gambar QRIS resmi (publik). ?download=1 untuk mengunduh sebagai file.
export async function GET(request: NextRequest) {
  const qris = await getQrisSetting();
  if (!qris) {
    return new NextResponse('QRIS belum tersedia', { status: 404 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage.from(QRIS_BUCKET).download(qris.path);
  if (error || !data) {
    return new NextResponse('QRIS belum tersedia', { status: 404 });
  }

  const ext = qris.path.split('.').pop()?.toLowerCase() || 'png';
  const contentType = data.type || (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png');
  const download = request.nextUrl.searchParams.get('download') === '1';

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      ...(download
        ? { 'Content-Disposition': `attachment; filename="QRIS-Tabungan-Qurban-MAKT.${ext === 'jpeg' ? 'jpg' : ext}"` }
        : {}),
    },
  });
}
