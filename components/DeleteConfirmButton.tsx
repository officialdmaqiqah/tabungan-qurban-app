'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function DeleteConfirmButton({ 
  title = "Hapus?", 
  message = "Apakah Anda yakin ingin menghapus ini? Tindakan ini tidak dapat dibatalkan.",
  iconSize = "w-4 h-4"
}: {
  title?: string;
  message?: string;
  iconSize?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" 
        title={title}
      >
        <Trash2 className={iconSize} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200 text-left">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm mb-6">
              {message}
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
