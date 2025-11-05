"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  tone: "default" | "danger";
}

type ConfirmDialogHandler = (options?: ConfirmDialogOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmDialogHandler | null>(null);

const defaultState: Omit<ConfirmDialogState, "open"> = {
  title: "Are you absolutely sure?",
  description:
    "This action cannot be undone and may remove important information.",
  confirmText: "Continue",
  cancelText: "Cancel",
  tone: "danger",
};

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const settleDialog = useCallback(
    (result: boolean) => {
      setDialog((prev) => (prev ? { ...prev, open: false } : prev));
      const resolver = resolverRef.current;
      resolverRef.current = null;
      clearExistingTimeout();
      timeoutRef.current = setTimeout(() => {
        setDialog(null);
      }, 180);
      resolver?.(result);
    },
    [clearExistingTimeout]
  );

  const confirm = useCallback<ConfirmDialogHandler>(
    (options) => {
      clearExistingTimeout();
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setDialog({
          open: true,
          title: options?.title ?? defaultState.title,
          description: options?.description ?? defaultState.description,
          confirmText: options?.confirmText ?? defaultState.confirmText,
          cancelText: options?.cancelText ?? defaultState.cancelText,
          tone: options?.tone ?? defaultState.tone,
        });
      });
    },
    [clearExistingTimeout]
  );

  useEffect(() => {
    if (!dialog?.open) return;

    confirmButtonRef.current?.focus({ preventScroll: true });

    const node = dialogRef.current;
    if (!node) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const focusable = Array.from(
          node.querySelectorAll<HTMLElement>(
            "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
          )
        ).filter((element) => !element.hasAttribute("disabled"));
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }

      if (event.key === "Enter" && document.activeElement === confirmButtonRef.current) {
        event.preventDefault();
        settleDialog(true);
      }
    };

    node.addEventListener("keydown", handleKeyDown);
    return () => {
      node.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialog?.open, settleDialog]);

  useEffect(() => {
    if (!dialog?.open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settleDialog(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [dialog?.open, settleDialog]);

  const value = useMemo(() => confirm, [confirm]);

  const confirmButtonClasses =
    dialog?.tone === "danger"
      ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-400 hover:to-rose-500 focus-visible:ring-rose-300"
      : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 focus-visible:ring-blue-300";

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialog && (
        <div
          role="presentation"
          className={`fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-200 ${
            dialog.open ? "opacity-100" : "opacity-0"
          }`}
          onMouseDown={() => settleDialog(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            ref={dialogRef}
            className={`relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/95 p-6 text-slate-800 shadow-[0_35px_120px_-35px_rgba(15,23,42,0.6)] transition-all duration-200 ease-out backdrop-blur ${
              dialog.open
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-4 scale-95 opacity-0"
            } dark:border-slate-700/60 dark:bg-slate-900/95 dark:text-slate-100`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute -left-32 top-10 h-64 w-64 rounded-full bg-rose-400/40 blur-3xl mix-blend-multiply dark:bg-rose-500/30"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-36 -top-24 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl mix-blend-multiply dark:bg-indigo-500/30"
              aria-hidden
            />
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute right-4 top-4 rounded-full border border-transparent bg-slate-200/60 p-1 text-slate-500 transition hover:-translate-y-0.5 hover:bg-slate-300/80 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 focus-visible:ring-offset-slate-100 dark:bg-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-600 dark:focus-visible:ring-offset-slate-900"
              onClick={() => settleDialog(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-4">
              <div
                className={`group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-white shadow-inner transition-transform duration-200 ${
                  dialog.tone === "danger"
                    ? "border-rose-300/50 bg-gradient-to-br from-rose-500 via-rose-500/90 to-rose-600 shadow-[0_20px_45px_-25px_rgba(244,63,94,0.6)]"
                    : "border-blue-300/50 bg-gradient-to-br from-blue-500 via-indigo-500/90 to-indigo-600 shadow-[0_20px_45px_-25px_rgba(59,130,246,0.6)]"
                }`}
              >
                <AlertTriangle className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <h2 id="confirm-dialog-title" className="text-lg font-semibold">
                  {dialog.title}
                </h2>
                <p
                  id="confirm-dialog-description"
                  className="mt-1 text-sm text-slate-600 dark:text-slate-300"
                >
                  {dialog.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-slate-300/70 px-5 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white dark:focus-visible:ring-offset-slate-900"
                onClick={() => settleDialog(false)}
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold shadow-lg transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-900 ${confirmButtonClasses}`}
                onClick={() => settleDialog(true)}
                ref={confirmButtonRef}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  }
  return context;
}
