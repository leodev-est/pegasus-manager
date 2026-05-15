import { useEffect } from "react";
import { pushService } from "../services/pushService";
import { useAuth } from "../auth/AuthContext";

export function usePushSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!pushService.isSupported()) return;
    if (Notification.permission !== "granted") return;

    pushService.subscribe().catch(() => {});
  }, [user]);
}
