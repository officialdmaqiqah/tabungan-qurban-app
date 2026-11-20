import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/auth-guards';
import { buildXlsx, type CellValue, type XlsxColumn } from '@/lib/xlsx';

const PAGE = 1000;

/** Mengambil semua baris (Supabase membatasi 1000 baris per permintaan). */
async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  phone_normalized: string | null;
  kategori_jamaah: string | null;
  gender: string | null;
  address: string | null;
  role: string | null;
  approval_status: string | null;
  wa_opt_in: boolean | null;
  created_at: string;
};
type PackageRow = { user_id: string; quantity: number | null; qurban_packages: { name: string; price: number } | { name: string; price: number }[] | null };
type TxRow = { user_id: string; amount: number; status: string };

const ROLE_LABEL: Record<string, string> = { jamaah: 'Jamaah', admin: 'Admin/Bendahara', super_admin: 'Super Admin' };
const STATUS_LABEL: Record<string, string> = { approved: 'Disetujui', pending: 'Menunggu persetujuan', rejected: 'Ditolak' };

// Download seluruh data jamaah sebagai file Excel. Hanya admin/super admin.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Akses ditolak', { status: 403 });

  const adminClient = createAdminClient();
  try {
    const [profiles, packages, transactions] = await Promise.all([
      fetchAll<ProfileRow>((from, to) =>
        adminClient
          .from('profiles')
          .select('id, full_name, phone, phone_normalized, kategori_jamaah, gender, address, role, approval_status, wa_opt_in, created_at')
          .order('created_at', { ascending: true })
          .range(from, to)
      ),
      fetchAll<PackageRow>((from, to) =>
        adminClient.from('user_packages').select('user_id, quantity, qurban_packages(name, price)').range(from, to)
      ),
      fetchAll<TxRow>((from, to) => adminClient.from('transactions').select('user_id, amount, status').range(from, to)),
    ]);

    const pkgByUser = new Map<string, { names: string[]; target: number }>();
    for (const p of packages) {
      const pkg = Array.isArray(p.qurban_packages) ? p.qurban_packages[0] : p.qurban_packages;
      if (!pkg) continue;
      const qty = p.quantity || 1;
      const entry = pkgByUser.get(p.user_id) || { names: [], target: 0 };
      entry.names.push(`${pkg.name} (x${qty})`);
      entry.target += (Number(pkg.price) || 0) * qty;
      pkgByUser.set(p.user_id, entry);
    }

    const txByUser = new Map<string, { verified: number; pending: number }>();
    for (const t of transactions) {
      const entry = txByUser.get(t.user_id) || { verified: 0, pending: 0 };
      if (t.status === 'verified') entry.verified += Number(t.amount) || 0;
      else if (t.status === 'pending') entry.pending += Number(t.amount) || 0;
      txByUser.set(t.user_id, entry);
    }

    const columns: XlsxColumn[] = [
      { header: 'No', width: 6, type: 'number' },
      { header: 'Nama Lengkap', width: 28 },
      { header: 'No. WhatsApp', width: 17 },
      { header: 'Kategori', width: 22 },
      { header: 'Gender', width: 12 },
      { header: 'Alamat', width: 50 },
      { header: 'Role', width: 17 },
      { header: 'Status Akun', width: 22 },
      { header: 'Paket Pilihan', width: 34 },
      { header: 'Target (Rp)', width: 15, type: 'number' },
      { header: 'Tabungan Terverifikasi (Rp)', width: 26, type: 'number' },
      { header: 'Setoran Menunggu Verifikasi (Rp)', width: 30, type: 'number' },
      { header: 'Sisa Target (Rp)', width: 17, type: 'number' },
      { header: 'Progres (%)', width: 12, type: 'percent' },
      { header: 'Terima Notifikasi WA', width: 20 },
      { header: 'Tanggal Daftar', width: 18 },
    ];

    const rows: CellValue[][] = profiles.map((p, i) => {
      const pkg = pkgByUser.get(p.id);
      const tx = txByUser.get(p.id) || { verified: 0, pending: 0 };
      const target = pkg?.target || 0;
      const progress = target > 0 ? Math.min(100, Math.round((tx.verified / target) * 100)) : 0;
      return [
        i + 1,
        p.full_name || '-',
        p.phone_normalized || p.phone || '-',
        p.kategori_jamaah || '-',
        p.gender || '-',
        p.address || '-',
        ROLE_LABEL[p.role || 'jamaah'] || p.role || '-',
        STATUS_LABEL[p.approval_status || 'approved'] || p.approval_status || '-',
        pkg?.names.join(', ') || 'Belum memilih',
        target,
        tx.verified,
        tx.pending,
        Math.max(0, target - tx.verified),
        progress,
        p.wa_opt_in ? 'Ya' : 'Tidak',
        new Date(p.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }),
      ];
    });

    const file = buildXlsx('Data Jamaah', columns, rows);

    await adminClient.from('audit_logs').insert({
      admin_id: admin.id,
      action: 'download data jamaah',
      target_id: null,
      details: `Mengunduh data ${profiles.length} jamaah (Excel)`,
      created_at: new Date().toISOString(),
    });

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    return new NextResponse(file as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="data-jamaah-${today}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Export data jamaah failed:', err);
    return new NextResponse('Gagal membuat file data jamaah.', { status: 500 });
  }
}
