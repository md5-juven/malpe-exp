import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export type ConfirmTone = "danger" | "default";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export interface AlertOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

interface AlertContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | null>(null);

interface DialogState {
  kind: "confirm" | "alert";
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
  resolve: (value: boolean) => void;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const close = useCallback((result: boolean) => {
    setDialog((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: "confirm",
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        tone: options.tone ?? "default",
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: "alert",
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Got it",
        cancelLabel: "",
        tone: "default",
        resolve: () => resolve(),
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      close(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [dialog, close]);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      {createPortal(
        <AnimatePresence>
          {dialog ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.button
                type="button"
                aria-label="Dismiss"
                className="absolute inset-0 bg-ink/75 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => close(false)}
              />
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="alert-title"
                aria-describedby="alert-message"
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ type: "spring", damping: 26, stiffness: 360 }}
                className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_28px_70px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(228,181,106,0.1)]"
              >
                <div className="px-5 pt-5 pb-4">
                  <div className="mb-4 flex items-start gap-3">
                    {dialog.tone === "danger" ? (
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose/15 text-rose ring-1 ring-inset ring-rose/25">
                        <AlertTriangle size={18} strokeWidth={1.75} />
                      </span>
                    ) : (
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-inset ring-gold/25">
                        <AlertTriangle size={18} strokeWidth={1.75} />
                      </span>
                    )}
                    <div className="min-w-0 pt-0.5">
                      <h2
                        id="alert-title"
                        className="font-display text-lg font-bold tracking-tight text-pearl"
                      >
                        {dialog.title}
                      </h2>
                      <p id="alert-message" className="mt-1.5 text-sm leading-relaxed text-muted">
                        {dialog.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {dialog.kind === "confirm" ? (
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => close(false)}
                        autoFocus
                      >
                        {dialog.cancelLabel}
                      </Button>
                    ) : null}
                    <Button
                      variant={dialog.tone === "danger" ? "danger" : "primary"}
                      className="flex-1"
                      onClick={() => close(true)}
                      autoFocus={dialog.kind === "alert"}
                    >
                      {dialog.confirmLabel}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return ctx;
}
