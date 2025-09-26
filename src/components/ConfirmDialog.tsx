import React from 'react';
import { WarningIcon, InfoIcon, QuestionIcon } from './icons';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <WarningIcon className="text-red-500" />,
          confirmButton:
            'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
        };
      case 'warning':
        return {
          icon: <InfoIcon className="text-yellow-500" />,
          confirmButton:
            'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
        };
      default:
        return {
          icon: <QuestionIcon className="text-blue-500" />,
          confirmButton:
            'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
        };
    }
  };

  if (!isOpen) return null;

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={handleOverlayClick}
    >
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">{styles.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-lg hover:bg-white/80 transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-all duration-200 shadow-lg ${styles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
