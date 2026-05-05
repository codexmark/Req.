import { getSessionFromRequest, getUsers, isBootstrapAllowed, sanitizeUser, findUserById } from "../_lib/store.js";
import { getRedisMode } from "../_lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
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
  } catch (error) {
    console.error("auth/session failed", error);
    return res.status(503).json({
      error: "Auth store unavailable",
      code: "AUTH_STORE_UNAVAILABLE",
      details: error?.message || "Unknown error",
      mode: getRedisMode(),
      hasRedisUrl: Boolean(process.env.REDIS_URL),
      hasKvRest: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
      hasUpstashRest: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    });
  }
}
