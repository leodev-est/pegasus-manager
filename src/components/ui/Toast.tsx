import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

declare global {
  interface WindowEventMap {
    "pegasus:toast": CustomEvent<{ message: string; type?: ToastType }>;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneMap: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);

  useEffect(() => {
    function handleToast(event: WindowEventMap["pegasus:toast"]) {
      showToast(event.detail.message, event.detail.type);
    }

    window.addEventListener("pegasus:toast", handleToast);
    return () => window.removeEventListener("pegasus:toast", handleToast);
  }, [showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-soft ${toneMap[toast.type]}`}
            key={toast.id}
          >
            <span>{toast.message}</span>
            <button aria-label="Fechar aviso" onClick={() => removeToast(toast.id)} type="button">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
