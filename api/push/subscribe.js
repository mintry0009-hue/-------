import { requireRole, requireUser } from "../_lib/auth.js";
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
    const { subscription } = body;

    if (!subscription?.endpoint) {
      sendJson(res, 400, { message: "유효한 구독 정보가 아닙니다." });
      return;
    }

    const supabase = getSupabaseAdmin();
    const upserted = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription_json: subscription,
      },
      {
        onConflict: "endpoint",
      },
    );

    if (upserted.error) {
      sendJson(res, 500, { message: "푸시 알림 구독 저장에 실패했습니다." });
      return;
    }

    sendJson(res, 201, { message: "푸시 알림 구독이 저장되었습니다." });
  } catch (error) {
    const status = error.message === "권한이 없습니다." ? 403 : 401;
    sendJson(res, status, { message: error.message });
  }
}
