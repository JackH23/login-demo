"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogBaseVariant = "primary" | "danger" | "success" | "warning" | "info";

export type ConfirmDialogVariant =
  | ConfirmDialogBaseVariant
  | "friend"
  | "edit"
  | "save";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ConfirmDialogVariant;
  contextLabel?: string;
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

type VariantTheme = {
  icon: ReactNode;
  base: ConfirmDialogBaseVariant;
};

const variantThemes: Record<ConfirmDialogVariant, VariantTheme> = {
  primary: { icon: "?", base: "primary" },
  info: { icon: "ℹ️", base: "info" },
  danger: { icon: "🗑️", base: "danger" },
  success: { icon: "🎉", base: "success" },
  warning: { icon: "⚠️", base: "warning" },
  friend: { icon: "🤝", base: "success" },
  edit: { icon: "✏️", base: "primary" },
  save: { icon: "💾", base: "info" },
};

export default function ConfirmDialog({
  isOpen,
  title = "Please confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  contextLabel,
  icon,
  confirmIcon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = useMemo(
    () => variantThemes[confirmVariant] ?? variantThemes.primary,
    [confirmVariant]
  );

  const finalIcon = icon ?? theme.icon;
  const iconContent = useMemo(() => {
    if (typeof finalIcon === "string") {
      return (
        <span aria-hidden className="confirm-dialog-icon-symbol">
          {finalIcon}
        </span>
      );
    }

    return (
      <span aria-hidden className="confirm-dialog-icon-symbol">
        {finalIcon}
      </span>
    );
  }, [finalIcon]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="confirm-dialog-card"
        data-variant={confirmVariant}
        data-base-variant={theme.base}
      >
        <div
          className={`confirm-dialog-icon confirm-dialog-icon-${theme.base}`}
          data-icon-variant={confirmVariant}
        >
          {iconContent}
        </div>
        {contextLabel && (
          <p className="confirm-dialog-eyebrow text-center text-uppercase mb-1">
            {contextLabel}
          </p>
        )}
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
            className={`btn btn-${theme.base} flex-fill`}
            onClick={onConfirm}
          >
            <span className="confirm-dialog-button-content">
              {confirmIcon && (
                <span aria-hidden className="confirm-dialog-button-icon">
                  {confirmIcon}
                </span>
              )}
              <span>{confirmText}</span>
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
