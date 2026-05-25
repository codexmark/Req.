import { handleUpload } from '@vercel/blob/client';
import { getSessionFromRequest } from '../_lib/store.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const auth = await getSessionFromRequest(req);
        if (!auth?.session) {
          throw new Error('Unauthorized');
        }

        const payload = parseClientPayload(clientPayload);
        const allowedContentTypes = payload.kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES;

        return {
          allowedContentTypes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: auth.session.userId,
            kind: payload.kind || 'unknown',
          }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    const status = error?.message === 'Unauthorized' ? 401 : 500;
    console.error('Blob upload token error:', error);
    return res.status(status).json({
      error: status === 401 ? 'Unauthorized' : 'Blob upload token failed',
      details: error?.message || 'Unknown error',
    });
  }
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function parseClientPayload(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}
