import { buildSessionCookie, createId, createSession, getUsers, hashPassword, isBootstrapAllowed, saveUsers, sanitizeUser } from "../_lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const users = await getUsers();
    if (!isBootstrapAllowed(users)) {
      return res.status(409).json({ error: "Bootstrap already completed" });
    }

    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const user = {
      id: createId("usr"),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      role: "admin",
      active: true,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUsers([user]);
    const { token } = await createSession(user);
    res.setHeader("Set-Cookie", buildSessionCookie(token));
    return res.status(201).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error("auth/bootstrap failed", error);
    return res.status(503).json({ error: "Auth store unavailable", code: "AUTH_STORE_UNAVAILABLE" });
  }
}
