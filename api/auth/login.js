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
  const { email, password } = body;
  const supabase = getSupabaseAdmin();
  const result = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  const user = result.data;

  if (!user) {
    sendJson(res, 401, { message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    sendJson(res, 401, { message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  sendJson(res, 200, {
    token: signToken(user.id),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  });
}
