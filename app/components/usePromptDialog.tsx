"use client";

import { ReactNode, useCallback, useMemo, useRef, useState } from "react";
import PromptDialog, { PromptDialogField } from "./PromptDialog";
import { ConfirmDialogVariant } from "./ConfirmDialog";

interface PromptDialogOptions {
  title?: string;
  description?: ReactNode;
  contextLabel?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ConfirmDialogVariant;
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  fields: PromptDialogField[];
}

type PromptDialogResult = Record<string, string> | null;

export function usePromptDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PromptDialogOptions | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const resolverRef = useRef<(value: PromptDialogResult) => void>();

  const prompt = useCallback((opts: PromptDialogOptions) => {
    return new Promise<Record<string, string> | null>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
      const defaults: Record<string, string> = {};
      opts.fields.forEach((field) => {
        defaults[field.name] = field.defaultValue ?? "";
      });
      setValues(defaults);
      setIsOpen(true);
    });
  }, []);

  const resolve = useCallback((value: PromptDialogResult) => {
    setIsOpen(false);
    const resolver = resolverRef.current;
    resolverRef.current = undefined;
    resolver?.(value);
  }, []);

  const handleChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const dialog = useMemo(() => {
    if (!options) return null;
    return (
      <PromptDialog
        isOpen={isOpen}
        title={options.title}
        description={options.description}
        contextLabel={options.contextLabel}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        confirmVariant={options.confirmVariant}
        icon={options.icon}
        confirmIcon={options.confirmIcon}
        fields={options.fields}
        values={values}
        onChange={handleChange}
        onCancel={() => resolve(null)}
        onSubmit={() => resolve({ ...values })}
      />
    );
  }, [handleChange, isOpen, options, resolve, values]);

  return { prompt, dialog };
}
