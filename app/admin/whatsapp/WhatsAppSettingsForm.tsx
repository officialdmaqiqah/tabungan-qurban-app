'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateWhatsAppSettings } from '@/app/actions/whatsapp_settings';

export default function WhatsAppSettingsForm({ initialSettings }: { initialSettings: any }) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    is_enabled: initialSettings?.is_enabled ?? false,
    dry_run: initialSettings?.dry_run ?? true,
    admin_notification_phone: initialSettings?.admin_notification_phone ?? '',
    send_to_admin_on_deposit_reported: initialSettings?.send_to_admin_on_deposit_reported ?? true,
    send_to_jamaah_on_deposit_approved: initialSettings?.send_to_jamaah_on_deposit_approved ?? true,
    send_to_jamaah_on_deposit_rejected: initialSettings?.send_to_jamaah_on_deposit_rejected ?? true,
    send_manual_reminder_enabled: initialSettings?.send_manual_reminder_enabled ?? true,
    send_welcome_on_registration: initialSettings?.send_welcome_on_registration ?? true,
  });

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateWhatsAppSettings(settings);
      if (res.success) {
        toast.success('Pengaturan WhatsApp berhasil disimpan');
      } else {
        toast.error('Gagal menyimpan: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kolom 1: Core Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800 border-b pb-2">Status Sistem</h3>
          
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <div>
              <span className="block font-medium text-slate-700 text-sm">Aktifkan Notifikasi WA</span>
              <span className="block text-xs text-slate-500">Master switch untuk seluruh notifikasi</span>
            </div>
            <input 
              type="checkbox" 
              checked={settings.is_enabled}
              onChange={(e) => handleChange('is_enabled', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-200 cursor-pointer">
            <div>
              <span className="block font-medium text-amber-800 text-sm">Mode Dry Run</span>
              <span className="block text-xs text-amber-600">Catat ke log tanpa kirim ke provider (Aman untuk test)</span>
            </div>
            <input 
              type="checkbox" 
              checked={settings.dry_run}
              onChange={(e) => handleChange('dry_run', e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
            />
          </label>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block font-medium text-slate-700 text-sm mb-1">Nomor WA Admin</label>
            <span className="block text-xs text-slate-500 mb-2">Penerima notifikasi laporan setoran (awalan 62)</span>
            <input 
              type="text" 
              value={settings.admin_notification_phone}
              onChange={(e) => handleChange('admin_notification_phone', e.target.value)}
              placeholder="62812xxx"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Kolom 2: Event Triggers */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800 border-b pb-2">Event Triggers</h3>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <div>
              <span className="block font-medium text-slate-700 text-sm">Laporan Setoran Baru</span>
              <span className="block text-xs text-slate-500">Kirim ke admin saat jamaah lapor setoran</span>
            </div>
            <input 
              type="checkbox" 
              checked={settings.send_to_admin_on_deposit_reported}
              onChange={(e) => handleChange('send_to_admin_on_deposit_reported', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <div>
              <span className="block font-medium text-slate-700 text-sm">Setoran Disetujui</span>
              <span className="block text-xs text-slate-500">Kirim ke jamaah saat setoran diverifikasi</span>
            </div>
            <input 
              type="checkbox" 
              checked={settings.send_to_jamaah_on_deposit_approved}
              onChange={(e) => handleChange('send_to_jamaah_on_deposit_approved', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <div>
              <span className="block font-medium text-slate-700 text-sm">Setoran Ditolak</span>
              <span className="block text-xs text-slate-500">Kirim ke jamaah saat setoran ditolak admin</span>
            </div>
            <input 
              type="checkbox" 
              checked={settings.send_to_jamaah_on_deposit_rejected}
              onChange={(e) => handleChange('send_to_jamaah_on_deposit_rejected', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <div>
              <span className="block font-medium text-slate-700 text-sm">Pendaftaran Berhasil</span>
              <span className="block text-xs text-slate-500">Kirim welcome message ke jamaah baru</span>
            </div>
            <input 
              type="checkbox" 
              checked={settings.send_welcome_on_registration}
              onChange={(e) => handleChange('send_welcome_on_registration', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </label>

        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button 
          type="submit" 
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </form>
  );
}
