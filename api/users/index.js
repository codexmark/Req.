import { createId, getUsers, hashPassword, requireSession, saveUsers, sanitizeUser } from "../_lib/store.js";

export default async function handler(req, res) {
  try {
    const auth = await requireSession(req, res);
    if (!auth) return;

    if (req.method === "GET") {
      const users = await getUsers();
      if (auth.session.role === "admin") {
        return res.status(200).json({ users: users.map(sanitizeUser) });
      }

      return res.status(200).json({
        users: users.filter((user) => user.active).map((user) => ({ id: user.id, name: user.name, role: user.role })),
      });
    }

    if (req.method === "POST") {
      if (auth.session.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const users = await getUsers();
      const { name, email, password, role = "editor", active = true } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email and password are required" });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      if (users.some((user) => user.email === normalizedEmail)) {
        return res.status(409).json({ error: "Email already exists" });
      }

      const user = {
        id: createId("usr"),
        name: String(name).trim(),
        email: normalizedEmail,
        role: role === "admin" ? "admin" : "editor",
        active: Boolean(active),
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      users.push(user);
      await saveUsers(users);
      return res.status(201).json({ user: sanitizeUser(user) });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("users/index failed", error);
    return res.status(503).json({ error: "Auth store unavailable", code: "AUTH_STORE_UNAVAILABLE" });
  }
}
