import webpush from "web-push";
import { config } from "./config.js";

if (config.vapidPublicKey && config.vapidPrivateKey) {
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey,
  );
}

export function getPublicVapidKey() {
  return config.vapidPublicKey;
}

export async function sendPushNotification(subscription, payload) {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    return;
  }

  const parsed =
    typeof subscription === "string" ? JSON.parse(subscription) : subscription;

  await webpush.sendNotification(parsed, JSON.stringify(payload));
}
