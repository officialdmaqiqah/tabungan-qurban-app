'use client';

import { useState } from 'react';
import { ChevronDown, Building2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FAQ({ bankAccounts = [] }: { bankAccounts?: any[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const effectiveBankAccounts = (bankAccounts && bankAccounts.length > 0)
    ? bankAccounts
    : [
        {
          id: 'default-sumsel',
          bank_name: 'Bank Sumsel Babel Syariah',
          account_number: '8080-90-16823',
          account_name: 'Qurban MAKT PKP'
        }
      ];

  const handleCopy = (accountNumber: string, id: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedId(id);
    toast.success('Nomor rekening berhasil disalin');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const faqs = [
    {
      question: "Bagaimana cara menabung qurban?",
      answer: "Anda dapat mendaftar melalui aplikasi ini, kemudian memilih paket qurban yang diinginkan. Setelah itu, Anda bisa mulai menyetorkan tabungan baik secara tunai ke panitia maupun transfer ke rekening resmi masjid, lalu melaporkannya melalui menu 'Lapor Setoran'."
    },
    {
      question: "Apakah saya bisa mengganti target qurban di tengah jalan?",
      answer: "Tentu! Anda bisa menghubungi Admin untuk mengubah paket qurban yang telah Anda pilih. Sistem akan otomatis menyesuaikan target tabungan Anda."
    },
    {
      question: "Bagaimana cara merevisi laporan setoran yang salah input?",
      answer: "Selama status setoran masih 'Pending', Anda bisa membatalkan laporan Anda dan mengirim ulang. Jika sudah diverifikasi, silakan hubungi admin untuk melakukan koreksi saldo."
    },
    {
      question: "Setelah jamaah mengirim reset password, seterusnya gimana?",
      answer: "Admin akan memverifikasi identitas Anda (misalnya dengan mencocokkan nomor WhatsApp dan nama Anda). Setelah sesuai, Admin akan membuatkan password baru secara manual dan memberikannya langsung kepada Anda melalui WhatsApp."
    },
    {
      question: "Ke mana saya harus transfer uang tabungannya?",
      answer: (
        <div className="space-y-4 mt-2">
          <p className="text-slate-600">Silakan transfer setoran tabungan Anda ke rekening resmi Tabungan Qurban MAKT berikut ini:</p>
          <div className="grid gap-3">
            {effectiveBankAccounts.map((bank: any) => (
              <div key={bank.id} className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-white text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-emerald-100">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-block text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-100 mb-1">
                      {bank.bank_name}
                    </span>
                    <div className="font-mono font-black text-slate-900 text-lg tracking-wide">{bank.account_number}</div>
                    <div className="text-xs text-slate-600 font-medium">a.n. <span className="font-semibold text-slate-800">{bank.account_name}</span></div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(bank.account_number, bank.id)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors self-start sm:self-center"
                >
                  {copiedId === bank.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Salin Nomor Rekening</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200/60">
            Pastikan Anda hanya mentransfer ke rekening yang tertera di atas. Bukti transfer nantinya diunggah di menu <strong>'Lapor Setoran'</strong>.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {faqs.map((faq, index) => (
        <div 
          key={index} 
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 hover:border-emerald-200"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
          >
            <span className="font-semibold text-slate-800 pr-8">{faq.question}</span>
            <ChevronDown 
              className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                openIndex === index ? 'rotate-180 text-emerald-600' : ''
              }`} 
            />
          </button>
          
          <div 
            className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === index ? 'max-h-[600px] pb-5 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="text-slate-600 text-sm leading-relaxed">
              {faq.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
