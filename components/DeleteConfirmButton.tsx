'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export default function DeleteConfirmButton({ 
  title = "Hapus Data?", 
  message = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.",
  iconSize = "w-4 h-4"
}: { 
  title?: string;
  message?: string;
  iconSize?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = () => {
    setSubmitting(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (submitting) return;
    setIsOpen(false);
  };

  return (
    <>
      <button 
        type="button" 
        onClick={handleOpen}
        className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors inline-flex items-center justify-center" 
        title={title}
        aria-label={title}
      >
        <Trash2 className={iconSize} />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        description="Konfirmasi penghapusan data dari sistem"
        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        iconBgColor="bg-red-50 text-red-600"
        maxWidth="max-w-md"
        disableBackdropClick={submitting}
      >
        <div className="space-y-4">
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 text-xs text-red-800 leading-relaxed">
            <span className="font-bold block mb-1 text-sm text-red-900">Perhatian:</span>
            {message}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={handleClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              onClick={() => setSubmitting(true)}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <span>{submitting ? 'Menghapus...' : 'Ya, Hapus'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
