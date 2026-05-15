function readEnv(name, fallback) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export const config = {
  supabaseUrl: readEnv("SUPABASE_URL", ""),
  supabaseAnonKey: readEnv("SUPABASE_ANON_KEY", ""),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
  jwtSecret: readEnv("JWT_SECRET", "change-this-secret"),
  vapidSubject: readEnv("VAPID_SUBJECT", "mailto:admin@example.com"),
  vapidPublicKey: readEnv("VAPID_PUBLIC_KEY", ""),
  vapidPrivateKey: readEnv("VAPID_PRIVATE_KEY", ""),
};
