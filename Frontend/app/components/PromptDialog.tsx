"use client";

import {
  ChangeEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ConfirmDialog, { ConfirmDialogVariant } from "./ConfirmDialog";

export interface PromptDialogField {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea";
  placeholder?: string;
  defaultValue?: string;
  helperText?: ReactNode;
  required?: boolean;
  autoFocus?: boolean;
}

interface PromptDialogProps {
  isOpen: boolean;
  title?: string;
  description?: ReactNode;
  contextLabel?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ConfirmDialogVariant;
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  fields: PromptDialogField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function PromptDialog({
  isOpen,
  title = "Update details",
  description,
  contextLabel,
  confirmText = "Save",
  cancelText = "Cancel",
  confirmVariant = "primary",
  icon,
  confirmIcon,
  fields,
  values,
  onChange,
  onCancel,
  onSubmit,
}: PromptDialogProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setTouched({});
    }
  }, [isOpen]);

  const fieldStates = useMemo(() => {
    return fields.map((field) => {
      const rawValue = values[field.name] ?? "";
      const trimmed = rawValue.trim();
      let error: string | null = null;
      if (field.required && trimmed === "") {
        error = "This field is required.";
      } else if (
        field.type === "number" &&
        trimmed !== "" &&
        Number.isNaN(Number(trimmed))
      ) {
        error = "Enter a valid number.";
      }

      return {
        field,
        value: rawValue,
        error,
        isValid: error === null,
      };
    });
  }, [fields, values]);

  const isFormValid = useMemo(
    () => fieldStates.every((state) => state.isValid),
    [fieldStates]
  );

  const markTouched = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!isFormValid) {
      setTouched((prev) => {
        const next = { ...prev };
        for (const field of fields) {
          next[field.name] = true;
        }
        return next;
      });
      return;
    }
    onSubmit();
  }, [fields, isFormValid, onSubmit]);

  const message = (
    <form
      className="prompt-dialog-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      {description && (
        <div className="prompt-dialog-description">{description}</div>
      )}
      <div className="prompt-dialog-fields">
        {fieldStates.map(({ field, value, error }) => {
          const showError = Boolean(error && touched[field.name]);
          const helperId = `${field.name}-helper`;
          const errorId = `${field.name}-error`;
          const commonProps = {
            id: field.name,
            name: field.name,
            value,
            onChange: (
              event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => onChange(field.name, event.target.value),
            onBlur: () => markTouched(field.name),
            placeholder: field.placeholder,
            "aria-describedby": `${field.helperText ? helperId : ""}${
              showError ? `${field.helperText ? " " : ""}${errorId}` : ""
            }`.trim() || undefined,
            "aria-invalid": showError || undefined,
            autoFocus: field.autoFocus,
          };

          return (
            <div key={field.name} className="prompt-dialog-field">
              <label className="prompt-dialog-label" htmlFor={field.name}>
                <span>{field.label}</span>
                {field.required && <span className="prompt-dialog-required">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  {...commonProps}
                  className="prompt-dialog-input"
                  rows={4}
                />
              ) : (
                <input
                  {...commonProps}
                  className="prompt-dialog-input"
                  type={field.type === "number" ? "number" : field.type ?? "text"}
                  inputMode={field.type === "number" ? "numeric" : undefined}
                />
              )}
              {field.helperText && (
                <div id={helperId} className="prompt-dialog-helper">
                  {field.helperText}
                </div>
              )}
              {showError && error && (
                <div id={errorId} className="prompt-dialog-error" role="alert">
                  {error}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button type="submit" hidden aria-hidden="true" />
    </form>
  );

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      confirmVariant={confirmVariant}
      contextLabel={contextLabel}
      icon={icon}
      confirmIcon={confirmIcon}
      confirmDisabled={!isFormValid}
      onCancel={onCancel}
      onConfirm={handleSubmit}
    />
  );
}
