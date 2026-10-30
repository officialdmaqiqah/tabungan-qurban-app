'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Smartphone, ArrowRight, Loader2, CheckCircle2, X } from 'lucide-react';
import { initiatePhoneVerification, confirmPhoneVerification } from '@/app/actions/phone_verification';
import { useRouter } from 'next/navigation';

interface VerifyPhoneModalProps {
  initialPhone: string;
  isInitiallyVerified: boolean;
}

export default function VerifyPhoneModal({
  initialPhone,
  isInitiallyVerified,
}: VerifyPhoneModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  const [phone, setPhone] = useState(initialPhone || '');
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(isInitiallyVerified);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await initiatePhoneVerification(phone);
      if (res.success) {
        setStep('otp');
        setCooldown(res.cooldownSeconds || 60);
      } else {
        setError(res.error || 'Gagal mengirimkan kode OTP.');
        if (res.cooldownSeconds) {
          setCooldown(res.cooldownSeconds);
        }
      }
    } catch {
      setError('Terjadi kendala jaringan saat meminta kode OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await confirmPhoneVerification(phone, otp);
      if (res.success) {
        setIsVerified(true);
        setStep('success');
        setSuccessMessage(res.message || 'Nomor berhasil diverifikasi!');
        router.refresh();
      } else {
        setError(res.error || 'Kode OTP tidak sesuai.');
      }
    } catch {
      setError('Terjadi kendala jaringan saat memverifikasi kode.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setIsOpen(false);
    setStep('input');
    setOtp('');
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <>
      {/* Verification Status Pill / Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2.5">
          {isVerified ? (
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900">
                {isVerified ? 'Nomor Terverifikasi' : 'Nomor Belum Terverifikasi'}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isVerified
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isVerified ? 'Aktif' : 'Perlu Tindakan'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {phone ? phone : 'Nomor WhatsApp belum terhubung'}
            </p>
          </div>
        </div>

        {!isVerified && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
          >
            Verifikasi
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Verifikasi Nomor WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tautkan nomor resmi untuk keamanan tabungan
                  </p>
                </div>
              </div>
              <button
                onClick={resetState}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {step === 'input' && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor WhatsApp Aktif
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                      required
                      autoFocus
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Format yang didukung: 08..., 628..., atau +628...
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60">
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Sistem akan mengirimkan 6 digit kode OTP resmi ke nomor WhatsApp ini untuk memastikan nomor aktif berada di tangan Anda.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || cooldown > 0}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengirim OTP...
                      </>
                    ) : cooldown > 0 ? (
                      `Tunggu ${cooldown} detik`
                    ) : (
                      'Kirim Kode OTP WhatsApp'
                    )}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-600">
                      Kode OTP telah dikirimkan ke WhatsApp:
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {phone}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                      Masukkan 6 Digit Kode OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.5em] text-2xl font-bold py-2.5 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                      required
                      autoFocus
                    />
                    <p className="mt-1 text-[11px] text-center text-slate-400">
                      Kode kadaluarsa dalam 5 menit
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Ubah nomor
                    </button>
                    <button
                      type="button"
                      disabled={cooldown > 0 || isLoading}
                      onClick={() => handleRequestOtp()}
                      className="text-emerald-600 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim Ulang OTP'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memverifikasi...
                      </>
                    ) : (
                      'Konfirmasi & Tautkan Nomor'
                    )}
                  </button>
                </form>
              )}

              {step === 'success' && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Alhamdulillah, Berhasil!
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {successMessage || 'Nomor WhatsApp Anda telah terverifikasi.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetState}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
