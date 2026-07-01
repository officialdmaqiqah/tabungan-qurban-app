'use client';

import { X } from 'lucide-react';
import { useRef } from 'react';

interface RejectButtonProps {
  txId: string;
  txAmount: string;
  txName: string;
  action: (formData: FormData) => void;
}

export default function RejectButton({ txId, txAmount, txName, action }: RejectButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleRejectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const note = window.prompt(`Alasan penolakan untuk setoran Rp ${txAmount} (${txName})?`);
    
    if (note !== null) { // if not cancelled
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'adminNote';
      input.value = note;
      formRef.current?.appendChild(input);
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="txId" value={txId} />
      <input type="hidden" name="txAmount" value={txAmount} />
      <input type="hidden" name="txName" value={txName} />
      <button 
        type="button" 
        onClick={handleRejectClick}
        className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors" 
        title="Tolak"
      >
        <X className="w-4 h-4" />
      </button>
    </form>
  );
}
