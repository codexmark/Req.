import { buildClearedSessionCookie, deleteSession, getSessionFromRequest } from "../_lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await getSessionFromRequest(req);
  if (auth?.token) {
    await deleteSession(auth.token);
  }

  res.setHeader("Set-Cookie", buildClearedSessionCookie());
  return res.status(200).json({ success: true });
}
