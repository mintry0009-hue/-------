import { requireUser } from "../_lib/auth.js";
import { getPublicVapidKey } from "../_lib/push.js";
import { sendJson } from "../_lib/response.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { message: "Method Not Allowed" });
    return;
  }

  try {
    await requireUser(req);
    sendJson(res, 200, { publicKey: getPublicVapidKey() });
  } catch (error) {
    sendJson(res, 401, { message: error.message });
  }
}
