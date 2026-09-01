import { useRegisterSW } from "virtual:pwa-register/react";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

// Se o navegador não trocar de controller a tempo (aba em segundo plano, race
// entre abas, etc.), força o reload de qualquer forma — evita ficar preso
// "atualizando" indefinidamente.
const FORCE_RELOAD_TIMEOUT_MS = 2500;

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  const [isUpdating, setIsUpdating] = useState(false);

  if (!needRefresh) return null;

  function handleUpdate() {
    setIsUpdating(true);
    const forceReload = setTimeout(() => window.location.reload(), FORCE_RELOAD_TIMEOUT_MS);
    updateServiceWorker(true).finally(() => clearTimeout(forceReload));
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 py-3 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      <RefreshCw className="shrink-0 text-pegasus-primary" size={18} />
      <p className="text-sm font-semibold text-pegasus-navy dark:text-white">
        Nova versão disponível
      </p>
      <button
        className="flex items-center gap-1.5 rounded-xl bg-pegasus-primary px-3 py-1.5 text-sm font-bold text-white transition hover:bg-pegasus-navy disabled:opacity-70"
        onClick={handleUpdate}
        disabled={isUpdating}
        type="button"
      >
        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : null}
        {isUpdating ? "Atualizando..." : "Atualizar"}
      </button>
    </div>
  );
}
