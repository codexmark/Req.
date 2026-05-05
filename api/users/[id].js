import { deleteUserById, findUserById, getUsers, hashPassword, requireSession, saveUsers, sanitizeUser } from "../_lib/store.js";

export default async function handler(req, res) {
  try {
    const auth = await requireSession(req, res, "admin");
    if (!auth) return;

    const { id } = req.query;
    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.method === "GET") {
      return res.status(200).json({ user: sanitizeUser(user) });
    }

    if (req.method === "PUT") {
      const users = await getUsers();
      const index = users.findIndex((item) => item.id === id);
      const { name, email, password, role, active } = req.body || {};
      const normalizedEmail = String(email || user.email).trim().toLowerCase();

      if (users.some((item) => item.id !== id && item.email === normalizedEmail)) {
        return res.status(409).json({ error: "Email already exists" });
      }

      const nextUser = {
        ...user,
        name: String(name || user.name).trim(),
        email: normalizedEmail,
        role: role === "admin" ? "admin" : "editor",
        active: typeof active === "boolean" ? active : user.active,
        updatedAt: new Date().toISOString(),
      };

      if (password) {
        nextUser.passwordHash = hashPassword(password);
      }

      users[index] = nextUser;
      await saveUsers(users);
      return res.status(200).json({ user: sanitizeUser(nextUser) });
    }

    if (req.method === "DELETE") {
      await deleteUserById(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("users/[id] failed", error);
    return res.status(503).json({ error: "Auth store unavailable", code: "AUTH_STORE_UNAVAILABLE" });
  }
}
