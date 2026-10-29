'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  maxWidth?: 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl';
  children: React.ReactNode;
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconBgColor = 'bg-slate-100 text-slate-700',
  maxWidth = 'max-w-lg',
  children,
  showCloseButton = true,
  disableBackdropClick = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableBackdropClick) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, disableBackdropClick]);

  if (!isOpen || !mounted) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden bg-slate-900/60 backdrop-blur-xs whitespace-normal text-left box-border"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity"
        onClick={() => {
          if (!disableBackdropClick) onClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 w-full ${maxWidth} min-w-0 max-w-full bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 box-border text-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 gap-3 shrink-0 w-full min-w-0 max-w-full box-border">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5 break-words line-clamp-2 sm:line-clamp-none">
                  {description}
                </p>
              )}
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors shrink-0 -mr-1 -mt-1"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden overscroll-contain space-y-4 w-full min-w-0 max-w-full box-border">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
