import crypto from "node:crypto";
import { getRedis } from "./redis.js";

const USERS_KEY = "reqcodex:users";
const SESSION_PREFIX = "reqcodex:session:";
const SESSION_COOKIE = "reqcodex_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash || "").split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(candidate, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function getUsers() {
  const redis = await getRedis();
  const raw = await redis.get(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveUsers(users) {
  const redis = await getRedis();
  await redis.set(USERS_KEY, JSON.stringify(users));
}

export async function findUserByEmail(email) {
  const users = await getUsers();
  return users.find((user) => user.email.toLowerCase() === String(email || "").trim().toLowerCase()) || null;
}

export async function findUserById(id) {
  const users = await getUsers();
  return users.find((user) => user.id === id) || null;
}

export async function upsertUser(nextUser) {
  const users = await getUsers();
  const index = users.findIndex((user) => user.id === nextUser.id);
  if (index >= 0) {
    users[index] = nextUser;
  } else {
    users.push(nextUser);
  }
  await saveUsers(users);
  return nextUser;
}

export async function deleteUserById(id) {
  const users = await getUsers();
  const filtered = users.filter((user) => user.id !== id);
  await saveUsers(filtered);
}

export function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(
    raw
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((pair) => {
        const separator = pair.indexOf("=");
        const key = separator >= 0 ? pair.slice(0, separator) : pair;
        const value = separator >= 0 ? pair.slice(separator + 1) : "";
        return [key, decodeURIComponent(value)];
      })
  );
}

export function buildSessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function buildClearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(user) {
  const redis = await getRedis();
  const token = crypto.randomBytes(24).toString("hex");
  const session = {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    createdAt: new Date().toISOString(),
  };

  await redis.set(`${SESSION_PREFIX}${token}`, JSON.stringify(session), { EX: SESSION_TTL_SECONDS });
  return { token, session };
}

export async function getSessionFromRequest(req) {
  const redis = await getRedis();
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const raw = await redis.get(`${SESSION_PREFIX}${token}`);
  const session = raw ? JSON.parse(raw) : null;
  if (!session) return null;
  return { token, session };
}

export async function deleteSession(token) {
  if (!token) return;
  const redis = await getRedis();
  await redis.del(`${SESSION_PREFIX}${token}`);
}

export async function requireSession(req, res, role = null) {
  const auth = await getSessionFromRequest(req);
  if (!auth?.session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (role && auth.session.role !== role) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return auth;
}

export function isBootstrapAllowed(users) {
  return !users.length;
}

export { SESSION_COOKIE };
