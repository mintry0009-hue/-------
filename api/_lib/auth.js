import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { getSupabaseAdmin } from "./supabase.js";

export function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
}

export function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  let payload;

  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new Error("유효하지 않은 토큰입니다.");
  }

  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .eq("id", payload.userId)
    .maybeSingle();

  if (result.error || !result.data) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  return result.data;
}

export function requireRole(user, role) {
  if (user.role !== role) {
    throw new Error("권한이 없습니다.");
  }
}
