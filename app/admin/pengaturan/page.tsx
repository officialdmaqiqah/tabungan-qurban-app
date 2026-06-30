import { createClient } from '@/lib/supabase/server';
import PengaturanForm from './PengaturanForm';

export default async function PengaturanPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('program_settings').select('*').single();
  const { data: bankAccounts } = await supabase.from('bank_accounts').select('*').order('created_at', { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Program</h1>
        <p className="text-slate-500">Atur profil program, tanggal pelaksanaan, dan manajemen rekening resmi.</p>
      </div>

      <PengaturanForm initialSettings={settings} initialBankAccounts={bankAccounts || []} />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Pusat Keamanan Data</h2>
        <p className="text-sm text-slate-500 mb-4">Unduh seluruh data aplikasi dalam format JSON sebagai cadangan pribadi Anda.</p>
        <a 
          href="/admin/backup"
          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Backup Data (.json)
        </a>
      </div>
    </div>
  );
}
