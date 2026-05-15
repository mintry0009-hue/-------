import { requireUser } from "./_lib/auth.js";
import {
  getClassDetail,
  getStudentClasses,
  getStudentNotices,
  getTeacherClasses,
} from "./_lib/class-data.js";
import { sendJson } from "./_lib/response.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { message: "Method Not Allowed" });
    return;
  }

  try {
    const user = await requireUser(req);

    if (user.role === "teacher") {
      const classes = await getTeacherClasses(user.id);
      const selectedClass = classes[0] ? await getClassDetail(classes[0].id) : null;
      sendJson(res, 200, { user, classes, selectedClass, notices: [] });
      return;
    }

    const [classes, notices] = await Promise.all([
      getStudentClasses(user.id),
      getStudentNotices(user.id),
    ]);

    sendJson(res, 200, { user, classes, selectedClass: null, notices });
  } catch (error) {
    sendJson(res, 401, { message: error.message });
  }
}
