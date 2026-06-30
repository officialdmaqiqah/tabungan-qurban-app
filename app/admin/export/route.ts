import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  
  if (profile?.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      method,
      status,
      created_at,
      profiles:user_id (full_name, phone)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return new NextResponse('Error fetching data', { status: 500 });
  }

  // Generate CSV
  const header = ['Tanggal', 'Nama Jamaah', 'No HP', 'Metode', 'Status', 'Nominal (Rp)'];
  const rows = transactions.map(tx => {
    const jamaah = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles;
    return [
      new Date(tx.created_at).toLocaleString('id-ID').replace(',', ''),
      `"${jamaah?.full_name || '-'}"`,
      `"${jamaah?.phone || '-'}"`,
      tx.method,
      tx.status,
      tx.amount
    ].join(',');
  });

  const csv = [header.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="laporan-setoran-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
