'use client';

export default function KategoriSelect({ 
  defaultValue, 
  action 
}: { 
  defaultValue: string, 
  action: (formData: FormData) => void 
}) {
  return (
    <form action={action} className="w-full sm:w-auto mt-1 sm:mt-0">
      <select 
        name="kategori" 
        defaultValue={defaultValue} 
        onChange={(e) => {
          const formData = new FormData(e.target.form!);
          action(formData);
        }}
        className="w-full text-sm border border-slate-200 rounded-md p-1.5 focus:outline-emerald-500 bg-slate-50 cursor-pointer"
      >
        <option value="">-- Pilih --</option>
        <option value="Pengurus Masjid">Pengurus Masjid</option>
        <option value="Remaja/Pemuda Masjid">Remaja/Pemuda Masjid</option>
        <option value="Jamaah Masjid">Jamaah Masjid</option>
        <option value="Masyarakat Umum">Masyarakat Umum</option>
      </select>
    </form>
  );
}
