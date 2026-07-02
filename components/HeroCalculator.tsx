'use client';

import { useState } from 'react';
import { Calculator, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { calculateDaysLeft } from '@/lib/utils';

type Package = {
  id: string;
  name: string;
  price: number;
};

export default function HeroCalculator({ packages, qurbanDate }: { packages: Package[] | null, qurbanDate?: string }) {
  const defaultPackages = [
    { id: '1', name: 'Sapi Patungan (1/7)', price: 3500000 },
    { id: '2', name: 'Kambing Standar', price: 2500000 },
  ];

  const availablePackages = packages && packages.length > 0 ? packages : defaultPackages;
  
  const [selectedPkg, setSelectedPkg] = useState<Package>(availablePackages[0]);

  const targetDateStr = qurbanDate || new Date(new Date().getFullYear(), 5, 15).toISOString(); // June 15 as fallback
  const daysLeft = calculateDaysLeft(targetDateStr);
  
  const price = selectedPkg.price;
  // Prevent division by zero
  const perDay = daysLeft > 0 ? price / daysLeft : price;
  const perWeek = daysLeft > 0 ? price / (daysLeft / 7) : price;
  const perMonth = daysLeft > 0 ? price / (daysLeft / 30) : price;

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="w-full max-w-sm bg-gradient-to-tr from-emerald-950/90 to-teal-900/90 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
      {/* Glow Effects */}
      <div className="absolute -right-12 -top-12 w-24 h-24 bg-amber-500 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs text-amber-300 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Kalkulator Qurban
            </p>
            <h4 className="text-xl font-bold text-white mt-1">Estimasi Target</h4>
          </div>
        </div>

        {/* Input Controls */}
        <div className="space-y-5">
          {/* Package Selection */}
          <div className="space-y-1.5">
            <label className="text-xs text-emerald-100/70 font-medium ml-1">Pilih Target Qurban:</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-black/20 border border-emerald-500/30 rounded-xl py-3 px-4 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                value={selectedPkg.id}
                onChange={(e) => {
                  const pkg = availablePackages.find(p => p.id === e.target.value);
                  if (pkg) setSelectedPkg(pkg);
                }}
              >
                {availablePackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id} className="text-slate-900">
                    {pkg.name} - {formatIDR(pkg.price)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-emerald-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          {/* Time Display (Countdown) */}
          <div className="bg-black/30 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-800/50 flex items-center justify-center border border-emerald-700">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider mb-0.5">Sisa Waktu</p>
                <p className="text-sm font-medium text-white">Menuju Idul Adha 2027</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-400">{daysLeft}</p>
              <p className="text-xs text-emerald-200/70">Hari Lagi</p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mt-6 pt-5 border-t border-emerald-500/20">
          <p className="text-xs text-emerald-100/70 mb-3 text-center">Estimasi setoran ideal Anda:</p>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-emerald-200/70 uppercase tracking-wider mb-1">Per Hari</span>
              <span className="text-lg font-bold text-white">{formatIDR(perDay)}</span>
            </div>
            <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-emerald-200/70 uppercase tracking-wider mb-1">Per Minggu</span>
              <span className="text-lg font-bold text-white">{formatIDR(perWeek)}</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-600/30 to-teal-500/30 rounded-xl p-3 border border-emerald-400/30 flex justify-between items-center">
            <span className="text-xs text-emerald-100 uppercase tracking-wider font-semibold">Atau Per Bulan</span>
            <span className="text-xl font-black text-amber-400">{formatIDR(perMonth)}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <Link
            href={`/register?packageId=${selectedPkg.id}`}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            Amankan Porsi Qurban Saya
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </div>
  );
}
