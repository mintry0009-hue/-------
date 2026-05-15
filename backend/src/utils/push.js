import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { config } from "../config.js";

let vapidPublicKey = config.vapidPublicKey;
let vapidPrivateKey = config.vapidPrivateKey;
const vapidKeyFile = path.resolve("data", "vapid-keys.json");

if (!vapidPublicKey || !vapidPrivateKey) {
  if (fs.existsSync(vapidKeyFile)) {
    const storedKeys = JSON.parse(fs.readFileSync(vapidKeyFile, "utf-8"));
    vapidPublicKey = storedKeys.publicKey;
    vapidPrivateKey = storedKeys.privateKey;
  } else {
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    fs.mkdirSync(path.dirname(vapidKeyFile), { recursive: true });
    fs.writeFileSync(
      vapidKeyFile,
      JSON.stringify(
        {
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey,
        },
        null,
        2,
      ),
      "utf-8",
    );
    console.log("VAPID keys were generated and saved for local development.");
  }
}

webpush.setVapidDetails(config.vapidSubject, vapidPublicKey, vapidPrivateKey);

export function getPublicVapidKey() {
  return vapidPublicKey;
}

export async function sendPushNotification(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}
