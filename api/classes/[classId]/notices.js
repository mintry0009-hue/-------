import { requireRole, requireUser } from "../../_lib/auth.js";
import { getClassForTeacher, getMembership } from "../../_lib/class-data.js";
import { sendPushNotification } from "../../_lib/push.js";
import { readJsonBody, sendJson } from "../../_lib/response.js";
import { getSupabaseAdmin } from "../../_lib/supabase.js";

async function getNoticesForClass(classId) {
  const supabase = getSupabaseAdmin();
  const noticesResult = await supabase
    .from("notices")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  const authorIds = [...new Set((noticesResult.data || []).map((item) => item.created_by))];
  const usersResult = authorIds.length
    ? await supabase.from("users").select("id, name").in("id", authorIds)
    : { data: [] };

  const userMap = new Map((usersResult.data || []).map((item) => [item.id, item.name]));

  return (noticesResult.data || []).map((notice) => ({
    ...notice,
    author_name: userMap.get(notice.created_by) || "",
  }));
}

export default async function handler(req, res) {
  try {
    const user = await requireUser(req);
    const { classId } = req.query;
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
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

      sendJson(res, 200, { notices: await getNoticesForClass(classId) });
      return;
    }

    if (req.method === "POST") {
      requireRole(user, "teacher");
      const classItem = await getClassForTeacher(classId, user.id);

      if (!classItem) {
        sendJson(res, 404, { message: "반을 찾을 수 없거나 권한이 없습니다." });
        return;
      }

      const body = await readJsonBody(req);
      const { title, content } = body;

      if (!title || !content) {
        sendJson(res, 400, { message: "제목과 내용을 입력해주세요." });
        return;
      }

      const inserted = await supabase
        .from("notices")
        .insert({
          class_id: classId,
          title,
          content,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (inserted.error || !inserted.data) {
        sendJson(res, 500, { message: "공지 생성에 실패했습니다." });
        return;
      }

      const notice = {
        ...inserted.data,
        author_name: user.name,
      };

      const memberships = await supabase
        .from("class_members")
        .select("user_id")
        .eq("class_id", classId);

      const studentIds = (memberships.data || []).map((item) => item.user_id);
      const subscriptions = studentIds.length
        ? await supabase
            .from("push_subscriptions")
            .select("id, subscription_json")
            .in("user_id", studentIds)
        : { data: [] };

      await Promise.all(
        (subscriptions.data || []).map(async (item) => {
          try {
            await sendPushNotification(item.subscription_json, {
              title: `[${classItem.name}] ${title}`,
              body: content,
              url: "/",
            });
          } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", item.id);
            }
          }
        }),
      );

      sendJson(res, 201, { notice });
      return;
    }

    sendJson(res, 405, { message: "Method Not Allowed" });
  } catch (error) {
    const status = error.message === "권한이 없습니다." ? 403 : 401;
    sendJson(res, status, { message: error.message });
  }
}
