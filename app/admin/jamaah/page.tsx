import { createClient } from '@/lib/supabase/server';
import SearchAndFilter from '../SearchAndFilter';
import Pagination from '../Pagination';
import { Users, Eye, ShieldAlert, UserCheck, User } from 'lucide-react';
import Link from 'next/link';
import ChangeRoleModal from './ChangeRoleModal';
import EditNameModal from './EditNameModal';
import ApprovalActions, { ApprovalBadge } from './ApprovalActions';
import DeleteJamaahButton from './DeleteJamaahButton';
import { getEffectiveRole, isSuperAdmin, UserRole, ROLE_LABELS } from '@/lib/roles';

export default async function AdminJamaahPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const itemsPerPage = 10;
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if current user is Super Admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, phone, full_name')
    .eq('id', user?.id || '')
    .single();

  const userIsSuperAdmin = isSuperAdmin(
    currentProfile?.role,
    user?.user_metadata?.role,
    currentProfile?.phone || user?.phone
  );

  // Fetch all jamaah with pagination and search
  let query = supabase
    .from('profiles')
    .select('*, user_packages(package_id, quantity, qurban_packages(name, price))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: jamaahList, count: totalJamaah } = await query;

  // Fetch transactions for the current page to calculate progress
  // Pendaftar yang menunggu persetujuan (selalu tampil di atas, tidak terpengaruh pencarian/halaman)
  const { data: pendingList } = await supabase
    .from('profiles')
    .select('id, full_name, phone_normalized, phone, kategori_jamaah, address, created_at')
    .eq('approval_status', 'pending')
    .not('role', 'in', '(admin,super_admin)')
    .order('created_at', { ascending: true })
    .limit(50);

  const jamaahIds = jamaahList?.map(j => j.id) || [];
  const { data: transactions } = await supabase
    .from('transactions')
    .select('user_id, amount')
    .in('user_id', jamaahIds)
    .eq('status', 'verified');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Data Jamaah & Pengguna</h1>
            <p className="text-sm text-slate-500">Kelola daftar pengguna, penetapan role Admin/Bendahara, dan pilihan paket Qurban.</p>
          </div>
        </div>

        {userIsSuperAdmin && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold self-start md:self-auto">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>Mode Super Admin Aktif (Dapat Mengubah Role)</span>
          </div>
        )}
      </div>

      {pendingList && pendingList.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
          <div>
            <h2 className="text-base font-bold text-amber-900">Menunggu Persetujuan ({pendingList.length})</h2>
            <p className="text-xs text-amber-800/80">Nomor WhatsApp pendaftar sudah terverifikasi lewat kode OTP. Periksa nama, kategori, dan alamat sebelum menyetujui.</p>
          </div>
          <div className="divide-y divide-amber-100 bg-white rounded-lg border border-amber-100">
            {pendingList.map((p) => (
              <div key={p.id} className="p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/jamaah/${p.id}`} className="font-semibold text-slate-900 hover:underline capitalize">{p.full_name || '-'}</Link>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {p.phone_normalized || p.phone || '-'} · {p.kategori_jamaah || 'Tanpa kategori'} · Daftar {new Date(p.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })}
                  </div>
                  {p.address && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.address}</div>}
                </div>
                <ApprovalActions userId={p.id} fullName={p.full_name || 'Jamaah'} status="pending" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <SearchAndFilter />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Jamaah & Kategori</th>
                <th className="px-4 py-3 font-semibold">No WhatsApp</th>
                <th className="px-4 py-3 font-semibold">Role Saat Ini</th>
                <th className="px-4 py-3 font-semibold">Progres</th>
                <th className="px-4 py-3 font-semibold">Paket Pilihan</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jamaahList && jamaahList.length > 0 ? (
                jamaahList.map((j) => {
                  const effectiveRole: UserRole = getEffectiveRole(j.role);

                  return (
                    <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 capitalize">{j.full_name}</div>
                        {j.approval_status && j.approval_status !== 'approved' && (
                          <div className="mt-1"><ApprovalBadge status={j.approval_status} /></div>
                        )}
                        {j.kategori_jamaah ? (
                          <div className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {j.kategori_jamaah}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-1 italic">Kategori blm diatur</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{j.phone || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {effectiveRole === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                            <span>Super Admin</span>
                          </span>
                        ) : effectiveRole === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Admin/Bendahara</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>Jamaah</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const targetAmount = j.user_packages?.reduce((sum: number, p: any) => sum + ((Number(p.qurban_packages?.price) || 0) * (p.quantity || 1)), 0) || 0;
                          const totalTabungan = transactions?.filter(t => t.user_id === j.id).reduce((sum, t) => sum + Number(t.amount), 0) || 0;
                          const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((totalTabungan / targetAmount) * 100)) : 0;
                          
                          return (
                            <div className="font-bold text-slate-700">{progressPercent}%</div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {j.user_packages && j.user_packages.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {j.user_packages.map((up: any) => (
                              <span key={up.package_id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {up.qurban_packages?.name} (x{up.quantity})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Belum memilih</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link 
                            href={`/admin/jamaah/${j.id}`}
                            title="Detail"
                            aria-label="Detail"
                            className="inline-flex items-center justify-center w-8 h-8 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg transition-all shadow-xs"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {userIsSuperAdmin && (
                            <>
                              <EditNameModal
                                user={{
                                  id: j.id,
                                  full_name: j.full_name,
                                  phone: j.phone,
                                }}
                                isCurrentSuperAdmin={true}
                              />
                              <ChangeRoleModal
                                user={{
                                  id: j.id,
                                  full_name: j.full_name,
                                  phone: j.phone,
                                  role: effectiveRole,
                                }}
                                isCurrentSuperAdmin={true}
                                currentUserId={user?.id}
                              />
                              {effectiveRole === 'jamaah' && j.id !== user?.id && (
                                <DeleteJamaahButton
                                  userId={j.id}
                                  fullName={j.full_name || 'Jamaah'}
                                  phone={j.phone_normalized || j.phone}
                                  compact
                                />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="font-medium text-slate-500">Tidak ada jamaah ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50/50">
          <Pagination totalItems={totalJamaah || 0} itemsPerPage={itemsPerPage} />
        </div>
      </div>
    </div>
  );
}
