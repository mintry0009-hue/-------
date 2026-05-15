import { requireRole, requireUser } from "../../_lib/auth.js";
import { getClassForTeacher } from "../../_lib/class-data.js";
import { readJsonBody, sendJson } from "../../_lib/response.js";
import { getSupabaseAdmin } from "../../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Method Not Allowed" });
    return;
  }

  try {
    const user = await requireUser(req);
    requireRole(user, "teacher");

    const { classId } = req.query;
    const allowed = await getClassForTeacher(classId, user.id);

    if (!allowed) {
      sendJson(res, 404, { message: "반을 찾을 수 없거나 권한이 없습니다." });
      return;
    }

    const body = await readJsonBody(req);
    const { name } = body;

    if (!name) {
      sendJson(res, 400, { message: "조 이름을 입력해주세요." });
      return;
    }

    const supabase = getSupabaseAdmin();
    const inserted = await supabase
      .from("groups")
      .insert({ class_id: classId, name })
      .select("*")
      .single();

    if (inserted.error || !inserted.data) {
      sendJson(res, 500, { message: "조 생성에 실패했습니다." });
      return;
    }

    sendJson(res, 201, { group: inserted.data });
  } catch (error) {
    const status = error.message === "권한이 없습니다." ? 403 : 401;
    sendJson(res, status, { message: error.message });
  }
}
