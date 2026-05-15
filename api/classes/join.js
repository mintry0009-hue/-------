import { requireRole, requireUser } from "../_lib/auth.js";
import { getMembership } from "../_lib/class-data.js";
import { readJsonBody, sendJson } from "../_lib/response.js";
import { getSupabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Method Not Allowed" });
    return;
  }

  try {
    const user = await requireUser(req);
    requireRole(user, "student");

    const body = await readJsonBody(req);
    const joinCode = String(body.joinCode || "").trim().toUpperCase();

    if (!joinCode) {
      sendJson(res, 400, { message: "참여 코드를 입력해주세요." });
      return;
    }

    const supabase = getSupabaseAdmin();
    const classResult = await supabase
      .from("classes")
      .select("*")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (!classResult.data) {
      sendJson(res, 404, { message: "참여 코드를 찾을 수 없습니다." });
      return;
    }

    const existing = await getMembership(classResult.data.id, user.id);
    if (existing) {
      sendJson(res, 409, { message: "이미 참여한 반입니다." });
      return;
    }

    const inserted = await supabase.from("class_members").insert({
      class_id: classResult.data.id,
      user_id: user.id,
    });

    if (inserted.error) {
      sendJson(res, 500, { message: "반 참여에 실패했습니다." });
      return;
    }

    sendJson(res, 201, { message: "반에 참여했습니다." });
  } catch (error) {
    const status = error.message === "권한이 없습니다." ? 403 : 401;
    sendJson(res, status, { message: error.message });
  }
}
