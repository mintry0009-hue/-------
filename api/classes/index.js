import { requireRole, requireUser } from "../_lib/auth.js";
import {
  createUniqueJoinCode,
  getStudentClasses,
  getTeacherClasses,
} from "../_lib/class-data.js";
import { readJsonBody, sendJson } from "../_lib/response.js";
import { getSupabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  try {
    const user = await requireUser(req);
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const classes =
        user.role === "teacher"
          ? await getTeacherClasses(user.id)
          : await getStudentClasses(user.id);

      sendJson(res, 200, { classes });
      return;
    }

    if (req.method === "POST") {
      requireRole(user, "teacher");
      const body = await readJsonBody(req);
      const { name, description } = body;

      if (!name) {
        sendJson(res, 400, { message: "반 이름을 입력해주세요." });
        return;
      }

      const joinCode = await createUniqueJoinCode();
      const inserted = await supabase
        .from("classes")
        .insert({
          name,
          description: description || "",
          join_code: joinCode,
          teacher_id: user.id,
        })
        .select("*")
        .single();

      if (inserted.error || !inserted.data) {
        sendJson(res, 500, { message: "반 생성에 실패했습니다." });
        return;
      }

      sendJson(res, 201, { class: inserted.data });
      return;
    }

    sendJson(res, 405, { message: "Method Not Allowed" });
  } catch (error) {
    const status = error.message === "권한이 없습니다." ? 403 : 401;
    sendJson(res, status, { message: error.message });
  }
}
