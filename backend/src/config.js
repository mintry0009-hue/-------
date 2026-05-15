import dotenv from "dotenv";

dotenv.config();

export const config = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change-this-secret",
  frontendUrl: process.env.FRONTEND_URL || "",
  vapidSubject: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
};
