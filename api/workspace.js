import { getSharedWorkspace, requireSession, saveSharedWorkspace } from "./_lib/store.js";

const MAX_WORKSPACE_BYTES = 1_800_000;
const MAX_SESSIONS = 250;

function normalizeWorkspace(input) {
  const workspace = input && typeof input === "object" ? input : {};
  const sessions = Array.isArray(workspace.sessions) ? workspace.sessions.slice(0, MAX_SESSIONS) : [];
  return {
    activeSessionId: workspace.activeSessionId || null,
    sessions,
    activity: Array.isArray(workspace.activity) ? workspace.activity.slice(0, 300) : [],
  };
}

export default async function handler(req, res) {
  try {
    const auth = await requireSession(req, res);
    if (!auth) return;

    if (req.method === "GET") {
      const workspace = await getSharedWorkspace();
      return res.status(200).json({ workspace });
    }

    if (req.method === "PUT") {
      const current = await getSharedWorkspace();
      const expectedRevision = Number(req.body?.expectedRevision);
      if (Number.isFinite(expectedRevision) && expectedRevision !== current.revision) {
        return res.status(409).json({
          error: "Workspace changed since it was loaded",
          code: "WORKSPACE_CONFLICT",
          workspace: current,
        });
      }

      const normalized = normalizeWorkspace(req.body?.workspace);
      if (Buffer.byteLength(JSON.stringify(normalized), "utf8") > MAX_WORKSPACE_BYTES) {
        return res.status(413).json({ error: "Workspace is too large", code: "WORKSPACE_TOO_LARGE" });
      }

      const now = new Date().toISOString();
      const next = {
        ...normalized,
        revision: current.revision + 1,
        updatedAt: now,
        updatedBy: {
          id: auth.session.userId,
          name: auth.session.name,
        },
      };
      await saveSharedWorkspace(next);
      return res.status(200).json({ workspace: next });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("workspace failed", error);
    return res.status(503).json({ error: "Workspace unavailable", code: "WORKSPACE_UNAVAILABLE" });
  }
}
