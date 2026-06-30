import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const [
      { data: profiles },
      { data: transactions },
      { data: user_packages },
      { data: qurban_packages },
      { data: bank_accounts },
      { data: program_settings }
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('user_packages').select('*'),
      supabase.from('qurban_packages').select('*'),
      supabase.from('bank_accounts').select('*'),
      supabase.from('program_settings').select('*')
    ]);

    const backupData = {
      exported_at: new Date().toISOString(),
      data: {
        profiles,
        transactions,
        user_packages,
        qurban_packages,
        bank_accounts,
        program_settings
      }
    };

    const jsonString = JSON.stringify(backupData, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-makt-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Backup Error:', error);
    return new NextResponse('Error generating backup', { status: 500 });
  }
}
