"use client";

import { ReactNode, useCallback, useMemo, useRef, useState } from "react";
import ConfirmDialog, { ConfirmDialogVariant } from "./ConfirmDialog";

interface ConfirmDialogOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ConfirmDialogVariant;
  contextLabel?: string;
  icon?: ReactNode;
  confirmIcon?: ReactNode;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({ message: "" });
  const resolverRef = useRef<(value: boolean) => void>();

  const confirm = useCallback((opts: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
      setIsOpen(true);
    });
  }, []);

  const resolve = useCallback((value: boolean) => {
    setIsOpen(false);
    const resolver = resolverRef.current;
    resolverRef.current = undefined;
    resolver?.(value);
  }, []);

  const dialog = useMemo(
    () => (
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        confirmVariant={options.confirmVariant}
        contextLabel={options.contextLabel}
        icon={options.icon}
        confirmIcon={options.confirmIcon}
        onCancel={() => resolve(false)}
        onConfirm={() => resolve(true)}
      />
    ),
    [isOpen, options, resolve]
  );

  return { confirm, dialog };
}
