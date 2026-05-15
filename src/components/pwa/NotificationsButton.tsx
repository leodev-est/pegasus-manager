import { Bell, BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { pushService } from "../../services/pushService";
import { useAuth } from "../../auth/AuthContext";

type Permission = "default" | "granted" | "denied";

export function NotificationsButton() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<Permission>("default");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pushService.isSupported()) return;
    setPermission(Notification.permission as Permission);
  }, []);

  if (!pushService.isSupported() || !user) return null;
  if (permission === "denied") return null;

  async function handleClick() {
    setIsLoading(true);
    try {
      const granted = await pushService.requestPermission();
      setPermission(granted ? "granted" : "denied");
      if (granted) {
        await pushService.subscribe();
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (permission === "granted") {
    return (
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
        title="Notificações ativadas"
      >
        <BellRing size={17} />
      </div>
    );
  }

  return (
    <button
      aria-label="Ativar notificações"
      className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 shadow-sm transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
      disabled={isLoading}
      onClick={handleClick}
      title="Ativar notificações push"
      type="button"
    >
      {isLoading ? <Bell className="animate-pulse" size={17} /> : <BellOff size={17} />}
    </button>
  );
}
