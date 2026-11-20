'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { approveRegistration, rejectRegistration } from '@/app/actions/admin_jamaah';

export function ApprovalBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" /> Menunggu persetujuan
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> Ditolak
      </span>
    );
  }
  return null;
}

export default function ApprovalActions({
  userId,
  fullName,
  status,
}: {
  userId: string;
  fullName: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [note, setNote] = useState('');

  const handleApprove = async () => {
    setLoading('approve');
    try {
      const res = await approveRegistration(userId);
      if (res.success) {
        toast.success(res.message || 'Pendaftaran disetujui.');
        setApproveOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('reject');
    try {
      const res = await rejectRegistration(userId, note);
      if (res.success) {
        toast.success(res.message || 'Pendaftaran ditolak.');
        setRejectOpen(false);
        setNote('');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <ApprovalBadge status={status} />
      <button
        type="button"
        onClick={() => setApproveOpen(true)}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold transition-all disabled:opacity-60"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Setujui
      </button>
      {status !== 'rejected' && (
        <button
          type="button"
          onClick={() => setRejectOpen(true)}
          disabled={loading !== null}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg font-semibold transition-all disabled:opacity-60"
        >
          <XCircle className="w-3.5 h-3.5" />
          Tolak
        </button>
      )}

      <Modal
        isOpen={approveOpen}
        onClose={() => loading === null && setApproveOpen(false)}
        title="Setujui Pendaftaran"
        description="Pastikan data pendaftar sudah sesuai"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading !== null}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="font-semibold text-slate-900 capitalize">{fullName}</div>
          </div>
          <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
            <li>Jamaah akan bisa mulai <span className="font-semibold text-slate-800">melaporkan setoran</span>.</li>
            <li>Jamaah menerima pemberitahuan lewat WhatsApp (bila bersedia menerima WA).</li>
            <li>Persetujuan tercatat di Audit Log.</li>
          </ul>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setApproveOpen(false)}
              disabled={loading !== null}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading !== null}
              autoFocus
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading === 'approve' && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading === 'approve' ? 'Menyetujui...' : 'Ya, Setujui'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={rejectOpen}
        onClose={() => loading === null && setRejectOpen(false)}
        title="Tolak Pendaftaran"
        description={`Pendaftaran ${fullName} akan ditolak dan jamaah tidak bisa melaporkan setoran.`}
        icon={<XCircle className="w-5 h-5 text-red-600" />}
        iconBgColor="bg-red-50 text-red-600"
        maxWidth="max-w-md"
        disableBackdropClick={loading !== null}
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Alasan (opsional, dikirim ke jamaah lewat WA)
            </label>
            <textarea
              rows={3}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Data nama/alamat tidak sesuai. Silakan hubungi panitia."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-600 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white resize-none"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              disabled={loading !== null}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading !== null}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading === 'reject' && <Loader2 className="w-4 h-4 animate-spin" />}
              Tolak Pendaftaran
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
