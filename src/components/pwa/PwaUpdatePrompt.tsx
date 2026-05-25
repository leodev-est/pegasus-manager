import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw } from "lucide-react";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      <RefreshCw className="shrink-0 text-pegasus-primary" size={18} />
      <p className="text-sm font-semibold text-pegasus-navy dark:text-white">
        Nova versão disponível
      </p>
      <button
        className="rounded-xl bg-pegasus-primary px-3 py-1.5 text-sm font-bold text-white transition hover:bg-pegasus-navy"
        onClick={() => updateServiceWorker(true)}
        type="button"
      >
        Atualizar
      </button>
    </div>
  );
}
