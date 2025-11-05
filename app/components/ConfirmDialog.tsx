"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type ConfirmDialogVariant = "primary" | "danger" | "success" | "warning";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantToSymbol: Record<ConfirmDialogVariant, string> = {
  primary: "?",
  danger: "!",
  success: "✓",
  warning: "!",
};

export default function ConfirmDialog({
  isOpen,
  title = "Please confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const symbol = useMemo(() => variantToSymbol[confirmVariant], [confirmVariant]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="confirm-dialog-card"
      >
        <div className={`confirm-dialog-icon confirm-dialog-icon-${confirmVariant}`}>
          <span aria-hidden className="confirm-dialog-icon-symbol">
            {symbol}
          </span>
        </div>
        <h5 id="confirm-dialog-title" className="text-center mb-3 fw-semibold">
          {title}
        </h5>
        <div className="confirm-dialog-message text-center text-body-secondary">
          {typeof message === "string" ? <p className="mb-0">{message}</p> : message}
        </div>
        <div className="d-flex flex-column flex-sm-row gap-2 mt-4">
          <button
            type="button"
            className="btn btn-outline-secondary flex-fill"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-${confirmVariant} flex-fill`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
