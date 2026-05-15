import { api } from "./api";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array(Array.from(rawData, (c) => c.charCodeAt(0)));
}

export const pushService = {
  isSupported() {
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  },

  async subscribe(): Promise<boolean> {
    if (!this.isSupported() || !VAPID_PUBLIC_KEY) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await this.sendSubscriptionToServer(existing);
        return true;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await this.sendSubscriptionToServer(subscription);
      return true;
    } catch (err) {
      console.warn("[Push] subscribe failed:", err);
      return false;
    }
  },

  async sendSubscriptionToServer(subscription: PushSubscription) {
    const json = subscription.toJSON();
    await api.post("/push/subscribe", {
      endpoint: json.endpoint,
      keys: json.keys,
    });
  },

  async unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      await api.post("/push/unsubscribe", { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    } catch (err) {
      console.warn("[Push] unsubscribe failed:", err);
    }
  },
};
