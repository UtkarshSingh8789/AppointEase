import React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '@/utils/cn';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmVariant, { icon: React.ReactNode; iconBg: string }> = {
  danger: {
    icon: <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  info: {
    icon: <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

/**
 * Reusable confirmation dialog for risky or destructive actions.
 * Shows a modal with icon, title, message, and confirm/cancel buttons.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const config = variantConfig[variant];

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
            config.iconBg
          )}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
