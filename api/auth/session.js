import { getSessionFromRequest, getUsers, isBootstrapAllowed, sanitizeUser, findUserById } from "../_lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const users = await getUsers();
  const auth = await getSessionFromRequest(req);

  if (!auth?.session) {
    return res.status(200).json({ authenticated: false, bootstrapRequired: isBootstrapAllowed(users) });
  }

  const user = await findUserById(auth.session.userId);
  if (!user || !user.active) {
    return res.status(200).json({ authenticated: false, bootstrapRequired: isBootstrapAllowed(users) });
  }

  return res.status(200).json({
    authenticated: true,
    bootstrapRequired: false,
    user: sanitizeUser(user),
  });
}
