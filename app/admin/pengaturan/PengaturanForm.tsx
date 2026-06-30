'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Calendar, Building, Save, Info, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PengaturanForm({ 
  initialSettings,
  initialBankAccounts
}: { 
  initialSettings: any;
  initialBankAccounts: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  
  const [programName, setProgramName] = useState(initialSettings?.program_name || '');
  const [programYear, setProgramYear] = useState(initialSettings?.program_year || '');
  const [date, setDate] = useState(initialSettings?.qurban_date || '');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(initialSettings?.is_registration_open ?? true);
  
  const [bankAccounts, setBankAccounts] = useState<any[]>(initialBankAccounts || []);
  
  const [bankToDelete, setBankToDelete] = useState<{ id: string, isNew: boolean } | null>(null);

  const handleAddBank = () => {
    setBankAccounts([...bankAccounts, { id: 'new-' + Date.now(), bank_name: '', account_number: '', account_name: '', is_active: true, isNew: true }]);
  };

  const handleRemoveBank = (id: string, isNew: boolean) => {
    if (isNew) {
      setBankAccounts(bankAccounts.filter(b => b.id !== id));
      return;
    }
    setBankToDelete({ id, isNew });
  };

  const confirmRemoveBank = async () => {
    if (!bankToDelete) return;
    const { id } = bankToDelete;
    setBankToDelete(null);

    try {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
      if (error) throw error;
      setBankAccounts(bankAccounts.filter(b => b.id !== id));
      toast.success('Rekening dihapus');
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const handleBankChange = (id: string, field: string, value: any) => {
    setBankAccounts(bankAccounts.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Update program settings
      const { error: settingsError } = await supabase
        .from('program_settings')
        .update({
          program_name: programName,
          program_year: programYear,
          qurban_date: date,
          is_registration_open: isRegistrationOpen,
          updated_at: new Date().toISOString()
        })
        .eq('id', initialSettings?.id);

      if (settingsError) throw settingsError;
      
      // 2. Upsert bank accounts
      for (const bank of bankAccounts) {
        if (!bank.bank_name || !bank.account_number || !bank.account_name) continue;
        
        const payload = {
          bank_name: bank.bank_name,
          account_number: bank.account_number,
          account_name: bank.account_name,
          is_active: bank.is_active
        };

        if (bank.isNew) {
          const { error } = await supabase.from('bank_accounts').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('bank_accounts').update(payload).eq('id', bank.id);
          if (error) throw error;
        }
      }
      
      toast.success('Pengaturan berhasil disimpan!');
      router.refresh();
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section: Profil Program */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-600" />
            Profil Program
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Program</label>
              <input 
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Contoh: Tabungan Qurban"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Pelaksanaan</label>
              <input 
                type="text"
                value={programYear}
                onChange={(e) => setProgramYear(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Contoh: 1446 H / 2026 M"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Pelaksanaan Qurban</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex items-center mt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isRegistrationOpen} onChange={(e) => setIsRegistrationOpen(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-700">Pendaftaran Buka</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section: Rekening Bank */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              Rekening Pembayaran Resmi
            </h2>
            <button
              type="button"
              onClick={handleAddBank}
              className="text-sm px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Tambah Rekening
            </button>
          </div>
          
          <div className="space-y-3">
            {bankAccounts.map((bank, index) => (
              <div key={bank.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nama Bank</label>
                  <input type="text" value={bank.bank_name} onChange={(e) => handleBankChange(bank.id, 'bank_name', e.target.value)} required placeholder="BSI, BCA..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nomor Rekening</label>
                  <input type="text" value={bank.account_number} onChange={(e) => handleBankChange(bank.id, 'account_number', e.target.value)} required placeholder="1234567890" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Atas Nama</label>
                  <input type="text" value={bank.account_name} onChange={(e) => handleBankChange(bank.id, 'account_name', e.target.value)} required placeholder="Masjid Agung..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div className="md:col-span-2 flex items-end gap-2 mt-4 md:mt-0 justify-end md:justify-start">
                  <label className="flex items-center gap-1 text-xs cursor-pointer bg-white px-2 py-2 border border-slate-200 rounded-lg flex-1 justify-center">
                    <input type="checkbox" checked={bank.is_active} onChange={(e) => handleBankChange(bank.id, 'is_active', e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    Aktif
                  </label>
                  <button type="button" onClick={() => handleRemoveBank(bank.id, bank.isNew)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {bankAccounts.length === 0 && (
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                Belum ada rekening pembayaran. Klik "Tambah Rekening".
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Hanya rekening yang berstatus "Aktif" yang akan ditampilkan kepada Jamaah di halaman Lapor Setoran.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </form>

      {/* Modal Hapus Rekening */}
      {bankToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200 text-left">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <button type="button" onClick={() => setBankToDelete(null)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Rekening?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Yakin ingin menghapus rekening ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setBankToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={confirmRemoveBank}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
