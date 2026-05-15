import bcrypt from "bcryptjs";
import { signToken } from "../_lib/auth.js";
import { readJsonBody, sendJson } from "../_lib/response.js";
import { getSupabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Method Not Allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const { name, email, password, role } = body;

  if (!name || !email || !password || !["teacher", "student"].includes(role)) {
    sendJson(res, 400, { message: "필수값이 올바르지 않습니다." });
    return;
  }

  const supabase = getSupabaseAdmin();
  const existing = await supabase.from("users").select("id").eq("email", email).maybeSingle();

  if (existing.data) {
    sendJson(res, 409, { message: "이미 사용 중인 이메일입니다." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await supabase
    .from("users")
    .insert({
      name,
      email,
      password_hash: passwordHash,
      role,
    })
    .select("id, name, email, role, created_at")
    .single();

  if (inserted.error || !inserted.data) {
    sendJson(res, 500, { message: "회원가입 처리에 실패했습니다." });
    return;
  }

  sendJson(res, 201, {
    token: signToken(inserted.data.id),
    user: inserted.data,
  });
}
