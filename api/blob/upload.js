import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { getSessionFromRequest } from '../_lib/store.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await getSessionFromRequest(req);
    if (!auth?.session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = await readJsonBody(req);
    if (body?.type !== 'blob.generate-client-token') {
      return res.status(400).json({
        error: 'Invalid upload event',
        details: 'Expected blob.generate-client-token',
      });
    }

    const pathname = String(body?.payload?.pathname || '').trim();
    if (!pathname) {
      return res.status(400).json({
        error: 'Invalid upload payload',
        details: 'Missing pathname',
      });
    }

    const payload = parseClientPayload(body?.payload?.clientPayload);
    const allowedContentTypes = payload.kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES;

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname,
      allowedContentTypes,
      maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
      addRandomSuffix: true,
    });

    return res.status(200).json({ clientToken });
  } catch (error) {
    console.error('Blob upload token error:', error);
    return res.status(500).json({
      error: 'Blob upload token failed',
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
