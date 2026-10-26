"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AdminDialog } from "./Dialog";
import { Button } from "./Button";
import styles from "./Feedback.module.scss";

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "blue";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type ToastTone = "error" | "success";
export type ToastAction = { label: string; onClick: () => void | Promise<void> };
type ToastFn = (message: string, tone?: ToastTone, action?: ToastAction) => void;
type ToastItem = { id: number; message: string; tone: ToastTone; action?: ToastAction };

const ConfirmContext = createContext<ConfirmFn | null>(null);
const ToastContext = createContext<ToastFn | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToast = useRef(0);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setRequest({ options, resolve })),
    [],
  );

  const toast = useCallback<ToastFn>((message, tone = "error", action) => {
    const id = ++nextToast.current;
    setToasts((current) => [...current, { id, message, tone, action }]);
    window.setTimeout(
      () => {
        setToasts((current) => current.filter((item) => item.id !== id));
      },
      action ? 8000 : 4500,
    );
  }, []);

  function finish(value: boolean) {
    request?.resolve(value);
    setRequest(null);
  }

  const options = request?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={toast}>
        {children}
        {options ? (
          <AdminDialog
            variant="modal"
            title={options.title}
            onClose={() => finish(false)}
            footer={
              <>
                <Button variant="outlined" onClick={() => finish(false)}>
                  {options.cancelLabel ?? "Cancel"}
                </Button>
                <Button tone={options.tone ?? "danger"} onClick={() => finish(true)}>
                  {options.confirmLabel ?? "Delete"}
                </Button>
              </>
            }
          >
            {options.body ? <p className={styles.confirmBody}>{options.body}</p> : null}
          </AdminDialog>
        ) : null}

        <div className={styles.toastStack} aria-live="polite">
          {toasts.map((item) => (
            <div key={item.id} className={`${styles.toast} ${item.tone === "success" ? styles.toastSuccess : styles.toastError}`} role="status">
              <span className={styles.toastDot} aria-hidden="true" />
              <p className={styles.toastText}>{item.message}</p>
              {item.action ? (
                <button
                  type="button"
                  className={styles.toastAction}
                  onClick={() => {
                    const action = item.action;
                    setToasts((current) => current.filter((t) => t.id !== item.id));
                    void action?.onClick();
                  }}
                >
                  {item.action.label}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.toastClose}
                aria-label="Dismiss notification"
                onClick={() => setToasts((current) => current.filter((t) => t.id !== item.id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside FeedbackProvider");
  return confirm;
}

export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside FeedbackProvider");
  return toast;
}
