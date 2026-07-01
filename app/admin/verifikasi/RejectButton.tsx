'use client';

import { X, AlertCircle } from 'lucide-react';
import { useRef, useState } from 'react';

interface RejectButtonProps {
  txId: string;
  txAmount: string;
  txName: string;
  action: (formData: FormData) => void;
}

export default function RejectButton({ txId, txAmount, txName, action }: RejectButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
    setNote('');
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    
    // Create hidden input for adminNote dynamically or update an existing one
    let input = formRef.current?.querySelector('input[name="adminNote"]') as HTMLInputElement;
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'adminNote';
      formRef.current?.appendChild(input);
    }
    input.value = note;
    
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <form action={action} ref={formRef}>
        <input type="hidden" name="txId" value={txId} />
        <input type="hidden" name="txAmount" value={txAmount} />
        <input type="hidden" name="txName" value={txName} />
        <button 
          type="button" 
          onClick={handleOpenClick}
          className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors" 
          title="Tolak"
        >
          <X className="w-4 h-4" />
        </button>
      </form>

      {/* Elegant Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
            onClick={handleCancel}
          ></div>
          
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden z-10 transform transition-all duration-300 scale-100 opacity-100">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tolak Setoran</h3>
                  <p className="text-sm text-slate-500">Rp {txAmount} dari {txName}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alasan Penolakan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Berikan alasan agar jamaah dapat memperbaikinya..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none bg-slate-50 focus:bg-white"
                  rows={3}
                  autoFocus
                ></textarea>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
              >
                Ya, Tolak Setoran
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
