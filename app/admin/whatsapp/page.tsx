import { createClient } from '@/lib/supabase/server';
import { MessageCircle, Check, X, ShieldAlert, SkipForward, Settings2, PlayCircle, Server } from 'lucide-react';
import { redirect } from 'next/navigation';
import TestWAForm from './TestWAForm';
import WhatsAppSettingsForm from './WhatsAppSettingsForm';

export default async function AdminWhatsAppLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  // Fetch Settings
  const { data: settings } = await supabase
    .from('whatsapp_settings')
    .select('*')
    .single();

  // Fetch Logs
  const { data: logs } = await supabase
    .from('whatsapp_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  // Config check
  const apiKey = process.env.XSENDER_API_KEY || '';
  const isKeyConfigured = apiKey && apiKey !== 'your_xsender_api_key_here';
  
  let apiUrl = process.env.XSENDER_API_URL || '';
  try {
    if (apiUrl) {
      const u = new URL(apiUrl);
      apiUrl = u.hostname + u.pathname;
    }
  } catch(e) {}
  
  const hasDeviceId = !!(process.env.XSENDER_DEVICE_ID || process.env.XSENDER_SENDER_ID);
  
  const lastTest = logs?.find(l => l.event_type === 'test_message');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Notifikasi</h1>
          <p className="text-slate-500 mt-1 text-sm">Kelola pengiriman notifikasi WhatsApp untuk jamaah dan admin MAKT.</p>
        </div>
      </div>

      {settings?.dry_run || process.env.WA_DRY_RUN === 'true' ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-800 font-bold text-sm">DRY RUN AKTIF</h3>
            <p className="text-amber-700 text-xs mt-1">Pesan tidak benar-benar dikirim ke provider API. Hanya disimulasikan dan disimpan ke dalam log.</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Test Form Card */}
        <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-800">Test Notifikasi</h2>
          </div>
          <div className="p-5">
            <TestWAForm />
          </div>
        </div>

        {/* Config Check Card */}
        <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-800">Provider Config Check</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">API_URL</span>
              <span className="font-medium text-slate-800 truncate max-w-[150px]">{apiUrl || 'Missing'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">API_KEY</span>
              {isKeyConfigured ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full">Configured</span>
              ) : (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full">Missing / Default</span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">DEVICE_ID</span>
              {hasDeviceId ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full">Configured</span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full">Not Set</span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
              <span className="text-slate-600">ENV WA_NOTIF_ENABLED</span>
              <span className="font-medium text-slate-800">{process.env.WA_NOTIF_ENABLED === 'true' ? 'True' : 'False'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Last Test Status</span>
              {lastTest ? (
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                  lastTest.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 
                  lastTest.status === 'failed' ? 'bg-red-100 text-red-700' :
                  lastTest.status === 'skipped_config_error' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {lastTest.status}
                </span>
              ) : (
                <span className="text-slate-400 text-xs">Belum ada test</span>
              )}
            </div>
          </div>
        </div>

        {/* Settings Form Row */}
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-800">Pengaturan Notifikasi</h2>
          </div>
          <div className="p-5">
            <WhatsAppSettingsForm initialSettings={settings} />
          </div>
        </div>

        {/* Logs Table */}
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Riwayat Terakhir</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white text-slate-400 uppercase text-xs border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium">Penerima</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs && logs.length > 0 ? (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs">
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{log.recipient_name || '-'}</div>
                        <div className="text-xs text-slate-500">{log.recipient_phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] rounded font-medium">
                          {log.event_type === 'registration_welcome_jamaah' ? 'Pendaftaran Jamaah Baru' :
                           log.event_type === 'deposit_reported_admin' ? 'Laporan Setoran ke Admin' :
                           log.event_type === 'deposit_approved_jamaah' ? 'Setoran Disetujui' :
                           log.event_type === 'deposit_rejected_jamaah' ? 'Setoran Ditolak' :
                           log.event_type === 'manual_reminder' ? 'Reminder Manual' :
                           log.event_type === 'test_message' ? 'Test Message' :
                           log.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.status === 'sent' && <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs"><Check className="w-3 h-3"/> Sent</span>}
                        {log.status === 'failed' && <span className="flex items-center gap-1 text-red-600 font-medium text-xs"><X className="w-3 h-3"/> Failed</span>}
                        {log.status === 'skipped_config_error' && <span className="flex items-center gap-1 text-orange-600 font-medium text-xs"><X className="w-3 h-3"/> Config Error</span>}
                        {log.status === 'skipped' && <span className="flex items-center gap-1 text-slate-500 font-medium text-xs"><SkipForward className="w-3 h-3"/> Skipped</span>}
                        {log.status === 'pending' && <span className="flex items-center gap-1 text-amber-600 font-medium text-xs"><ShieldAlert className="w-3 h-3"/> Pending</span>}
                        
                        {(log.error_message) && (
                          <div className="mt-1 text-[10px] text-red-500 font-medium">{log.error_message}</div>
                        )}
                        
                        <div className="mt-1 flex gap-2">
                          <details className="inline-block">
                            <summary className="text-[10px] text-indigo-500 hover:underline cursor-pointer">Pesan</summary>
                            <pre className="mt-1 p-2 bg-slate-50 text-[10px] text-slate-600 rounded whitespace-pre-wrap font-sans border border-slate-100 max-h-24 overflow-y-auto">
                              {log.message}
                            </pre>
                          </details>
                          
                          {log.provider_response && (
                            <details className="inline-block">
                              <summary className="text-[10px] text-emerald-600 hover:underline cursor-pointer">Provider Response</summary>
                              <pre className="mt-1 p-2 bg-slate-50 text-[10px] text-slate-600 rounded whitespace-pre-wrap font-sans border border-slate-100 max-h-24 overflow-y-auto">
                                {JSON.stringify(log.provider_response, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                      Belum ada log notifikasi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
