import { requireRole, requireUser } from "../../_lib/auth.js";
import { getClassForTeacher, getMembership } from "../../_lib/class-data.js";
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
    const { studentId, groupId } = body;
    const membership = await getMembership(classId, studentId);

    if (!membership) {
      sendJson(res, 404, { message: "해당 학생은 이 반에 참여하지 않았습니다." });
      return;
    }

    const supabase = getSupabaseAdmin();

    if (groupId) {
      const group = await supabase
        .from("groups")
        .select("id")
        .eq("id", groupId)
        .eq("class_id", classId)
        .maybeSingle();

      if (!group.data) {
        sendJson(res, 404, { message: "조를 찾을 수 없습니다." });
        return;
      }
    }

    const updated = await supabase
      .from("class_members")
      .update({ group_id: groupId || null })
      .eq("class_id", classId)
      .eq("user_id", studentId);

    if (updated.error) {
      sendJson(res, 500, { message: "학생 배정에 실패했습니다." });
      return;
    }

    sendJson(res, 200, { message: "학생 배정이 완료되었습니다." });
  } catch (error) {
    const status = error.message === "권한이 없습니다." ? 403 : 401;
    sendJson(res, status, { message: error.message });
  }
}
