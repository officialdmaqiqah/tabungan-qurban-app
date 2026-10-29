'use client';

import React from 'react';
import Modal from './Modal';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  loading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'primary',
  loading = false,
  children,
}: ConfirmDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          iconBg: 'bg-red-50 text-red-600',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50 text-amber-600',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
          iconBg: 'bg-emerald-50 text-emerald-600',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
        };
      case 'primary':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50 text-blue-600',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
        };
    }
  };

  const { icon, iconBg, btnBg } = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={icon}
      iconBgColor={iconBg}
      maxWidth="max-w-md"
      disableBackdropClick={loading}
    >
      <div className="space-y-4">
        {children}

        {/* Action Buttons: [Batal] [Aksi Utama] */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${btnBg}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
