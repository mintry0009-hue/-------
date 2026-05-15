import { sendJson } from "./_lib/response.js";

export default async function handler(_req, res) {
  sendJson(res, 200, { ok: true });
}
