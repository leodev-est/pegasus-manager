import webpush from "web-push";
import { prisma } from "../../config/prisma";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export const pushService = {
  getPublicKey() {
    return { publicKey: vapidPublicKey };
  },

  async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  },

  async unsubscribe(endpoint: string) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  },

  async sendToUser(userId: string, payload: PushPayload) {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        ),
      ),
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(`[Push] ${failed.length} notifications failed for user ${userId}`);
    }
  },

  async sendToAll(payload: PushPayload) {
    const subs = await prisma.pushSubscription.findMany();
    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        ),
      ),
    );
  },

  async sendToRoles(roles: string[], payload: PushPayload) {
    const users = await prisma.userRole.findMany({
      where: { role: { name: { in: roles } } },
      select: { userId: true },
    });
    const userIds = [...new Set(users.map((u) => u.userId))];
    await Promise.allSettled(userIds.map((uid) => this.sendToUser(uid, payload)));
  },
};
