import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { toast } from "sonner";

type ToastType = "success" | "error" | "info";

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

declare global {
  interface WindowEventMap {
    "pegasus:toast": CustomEvent<{ message: string; type?: ToastType }>;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast.info(message);
  }, []);

  useEffect(() => {
    function handleToast(event: WindowEventMap["pegasus:toast"]) {
      showToast(event.detail.message, event.detail.type);
    }
    window.addEventListener("pegasus:toast", handleToast);
    return () => window.removeEventListener("pegasus:toast", handleToast);
  }, [showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
