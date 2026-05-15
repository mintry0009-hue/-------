import webpush from "web-push";

function getPushConfig() {
  return {
    subject: process.env["VAPID_SUBJECT"] || "mailto:admin@example.com",
    publicKey: process.env["VAPID_PUBLIC_KEY"] || "",
    privateKey: process.env["VAPID_PRIVATE_KEY"] || "",
  };
}

function ensureWebPushConfigured() {
  const config = getPushConfig();
  if (!config.publicKey || !config.privateKey) {
    return config;
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return config;
}

export function getPublicVapidKey() {
  return getPushConfig().publicKey;
}

export async function sendPushNotification(subscription, payload) {
  const config = ensureWebPushConfigured();
  if (!config.publicKey || !config.privateKey) {
    return;
  }

  const parsed =
    typeof subscription === "string" ? JSON.parse(subscription) : subscription;

  await webpush.sendNotification(parsed, JSON.stringify(payload));
}
