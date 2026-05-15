import { requireUser } from "../../_lib/auth.js";
import { getClassDetail, getClassForTeacher, getMembership } from "../../_lib/class-data.js";
import { sendJson } from "../../_lib/response.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { message: "Method Not Allowed" });
    return;
  }

  try {
    const user = await requireUser(req);
    const { classId } = req.query;

    if (user.role === "teacher") {
      const allowed = await getClassForTeacher(classId, user.id);
      if (!allowed) {
        sendJson(res, 404, { message: "반을 찾을 수 없거나 권한이 없습니다." });
        return;
      }
    } else {
      const membership = await getMembership(classId, user.id);
      if (!membership) {
        sendJson(res, 403, { message: "접근 권한이 없습니다." });
        return;
      }
    }

    const detail = await getClassDetail(classId);
    if (!detail) {
      sendJson(res, 404, { message: "반을 찾을 수 없습니다." });
      return;
    }

    sendJson(res, 200, detail);
  } catch (error) {
    sendJson(res, 401, { message: error.message });
  }
}
