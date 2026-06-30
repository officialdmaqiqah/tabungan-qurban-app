'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    answer: "Informasi rekening tujuan transfer yang resmi akan muncul saat Anda mengisi form 'Lapor Setoran' di dalam aplikasi. Pastikan Anda hanya mentransfer ke rekening yang tertera di sana."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
              openIndex === index ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <p className="text-slate-600 text-sm leading-relaxed">
              {faq.answer}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
