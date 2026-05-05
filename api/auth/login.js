import { buildSessionCookie, createSession, findUserByEmail, verifyPassword } from "../_lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { token } = await createSession(user);
    res.setHeader("Set-Cookie", buildSessionCookie(token));
    return res.status(200).json({ success: true, role: user.role });
  } catch (error) {
    console.error("auth/login failed", error);
    return res.status(503).json({ error: "Auth store unavailable", code: "AUTH_STORE_UNAVAILABLE" });
  }
}
