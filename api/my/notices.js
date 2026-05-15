import { requireRole, requireUser } from "../_lib/auth.js";
import { getStudentNotices } from "../_lib/class-data.js";
import { sendJson } from "../_lib/response.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { message: "Method Not Allowed" });
    return;
  }

  try {
    const user = await requireUser(req);
    requireRole(user, "student");
    const notices = await getStudentNotices(user.id);
    sendJson(res, 200, { notices });
  } catch (error) {
    const status = error.message === "권한이 없습니다." ? 403 : 401;
    sendJson(res, status, { message: error.message });
  }
}
