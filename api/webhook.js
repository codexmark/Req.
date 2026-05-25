import formidable from 'formidable';
import fs from 'node:fs/promises';
import { del } from '@vercel/blob';

const DISCORD_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL not configured');
      return res.status(500).json({ error: 'Webhook URL not configured' });
    }

    const payload = await readRequestPayload(req);
    const { card = {}, action = 'create', cardIndex = null, files = {}, media = {} } = payload;
    const discordRequest = await buildDiscordRequest({ webhookUrl, card, action, cardIndex, files, media });

    const discordResponse = await fetch(discordRequest.url, {
      method: discordRequest.method,
      headers: discordRequest.headers,
      body: discordRequest.body,
    });

    if (!discordResponse.ok) {
      const errorBody = await discordResponse.text();
      console.error('Discord webhook failed', discordResponse.status, errorBody);
      return res.status(500).json({ error: 'Webhook failed' });
    }

    if (discordRequest.cleanupTargets.length > 0) {
      await cleanupBlobTargets(discordRequest.cleanupTargets);
    }

    const discordPayload = await parseDiscordResponse(discordResponse);
    return res.status(200).json({
      success: true,
      discordMessageId: discordPayload?.id || card?.discordMessageId || null,
    });
  } catch (error) {
    console.error('Internal webhook error:', error);
    return res.status(500).json({ error: 'Internal error', details: error?.message || 'Unknown error' });
  }
}

async function readRequestPayload(req) {
  const contentType = String(req.headers['content-type'] || '');

  if (contentType.includes('multipart/form-data')) {
    return parseMultipartRequest(req);
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }

  return req.body || {};
}

async function parseMultipartRequest(req) {
  const form = formidable({
    multiples: true,
    maxFiles: 7,
    maxFileSize: DISCORD_MAX_UPLOAD_BYTES,
    allowEmptyFiles: false,
  });

  const { fields, files } = await new Promise((resolve, reject) => {
    form.parse(req, (error, parsedFields, parsedFiles) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });

  const rawPayload = firstValue(fields.payload);
  const parsedPayload = rawPayload ? JSON.parse(rawPayload) : {};

  return {
    ...parsedPayload,
    files: normalizeFiles(files),
  };
}

function normalizeFiles(files) {
  const photos = asArray(files.evidencePhotos).filter(Boolean);
  const legacyVideo = asArray(files.evidenceVideo).filter(Boolean);
  const videos = asArray(files.evidenceVideos).filter(Boolean).concat(legacyVideo);

  return {
    evidencePhotos: photos,
    evidenceVideos: videos,
  };
}

async function buildDiscordRequest({ webhookUrl, card, action, cardIndex, files, media }) {
  const embed = buildDiscordEmbed({ card, action, cardIndex });
  const cleanupTargets = collectCleanupTargets(media);
  const webhook = parseWebhookUrl(webhookUrl);

  if (action === 'delete') {
    if (!card?.discordMessageId) {
      throw new Error('Card sem discordMessageId para exclusão.');
    }
    return {
      url: `${webhook.messagesUrl}/${card.discordMessageId}`,
      method: 'DELETE',
      body: undefined,
      headers: undefined,
      cleanupTargets: [],
    };
  }

  const remotePhotos = normalizeRemoteUploads(media?.photos);
  const remoteVideos = normalizeRemoteUploads(media?.videos);
  const localPhotos = files?.evidencePhotos || [];
  const localVideos = files?.evidenceVideos || [];
  const hasAttachments =
    remotePhotos.length > 0 ||
    remoteVideos.length > 0 ||
    localPhotos.length > 0 ||
    localVideos.length > 0;

  if (!hasAttachments) {
    return {
      url:
        action === 'update' && card?.discordMessageId
          ? `${webhook.messagesUrl}/${card.discordMessageId}`
          : `${webhook.executeUrl}?wait=true`,
      method: action === 'update' && card?.discordMessageId ? 'PATCH' : 'POST',
      body: JSON.stringify({ embeds: [embed] }),
      headers: { 'Content-Type': 'application/json' },
      cleanupTargets: [],
    };
  }

  const formData = new FormData();
  const attachments = [];
  let attachmentIndex = 0;

  for (const item of remotePhotos) {
    attachmentIndex = await appendRemoteAttachment({
      item,
      kind: 'Foto de evidencia',
      attachmentIndex,
      formData,
      attachments,
    });
  }

  for (const item of remoteVideos) {
    attachmentIndex = await appendRemoteAttachment({
      item,
      kind: 'Vídeo da evidência',
      attachmentIndex,
      formData,
      attachments,
    });
  }

  for (const photo of localPhotos) {
    attachmentIndex = await appendLocalAttachment({
      file: photo,
      fallbackName: `foto-${attachmentIndex + 1}.png`,
      description: `Foto de evidencia ${attachmentIndex + 1}`,
      attachmentIndex,
      formData,
      attachments,
    });
  }

  for (const video of localVideos) {
    attachmentIndex = await appendLocalAttachment({
      file: video,
      fallbackName: `video-${attachmentIndex + 1}.mp4`,
      description: `Vídeo da evidência ${attachmentIndex + 1}`,
      attachmentIndex,
      formData,
      attachments,
    });
  }

  formData.append(
    'payload_json',
    JSON.stringify({
      embeds: [embed],
      attachments,
    })
  );

  return {
    url:
      action === 'update' && card?.discordMessageId
        ? `${webhook.messagesUrl}/${card.discordMessageId}`
        : `${webhook.executeUrl}?wait=true`,
    method: action === 'update' && card?.discordMessageId ? 'PATCH' : 'POST',
    body: formData,
    headers: undefined,
    cleanupTargets,
  };
}

function buildDiscordEmbed({ card, action, cardIndex }) {
  const titles = {
    create: 'Novo Card Criado! 📋',
    update: 'Card Atualizado! ✏️',
    delete: 'Card Excluído! 🗑️',
  };
  const colors = {
    create: 0x37b7a5,
    update: 0xf59e0b,
    delete: 0xf9736b,
  };

  const mediaSummary = [
    `${card?.evidenciasFotos?.length || 0} foto(s)`,
    `${card?.evidenciasVideos?.length || 0} vídeo(s)`,
  ].join(' • ');

  return {
    title: titles[action] || 'Card Modificado',
    color: colors[action] || 0x37b7a5,
    footer:
      action !== 'delete' && card?.cardId
        ? {
            text: `Card ID: ${card.cardId}`,
          }
        : undefined,
    fields:
      action !== 'delete'
        ? [
            { name: 'ID do Card', value: truncateField(card?.cardId) || 'N/A', inline: true },
            { name: 'Tipo', value: truncateField(card?.tipo) || 'N/A', inline: true },
            { name: 'Prioridade', value: truncateField(card?.prioridade) || 'N/A', inline: true },
            { name: 'Origem da Demanda', value: truncateField(card?.origemDemanda) || 'N/A', inline: true },
            { name: 'Impacto', value: truncateField(card?.impacto) || 'N/A', inline: false },
            { name: 'Contexto', value: truncateField(card?.contexto) || 'N/A', inline: false },
            {
              name: 'Comportamento Atual',
              value: truncateField(card?.comportamentoAtual) || 'N/A',
              inline: false,
            },
            {
              name: 'Comportamento Esperado',
              value: truncateField(card?.comportamentoEsperado) || 'N/A',
              inline: false,
            },
            {
              name: 'Regras de Negócio',
              value: truncateField(card?.regrasNegocio) || 'N/A',
              inline: false,
            },
            {
              name: 'Critérios de Aceite',
              value: truncateField(card?.criteriosAceite?.length ? card.criteriosAceite.join('\n') : 'Nenhum'),
              inline: false,
            },
            { name: 'Observação', value: truncateField(card?.observacao) || 'N/A', inline: false },
            { name: 'Evidências', value: mediaSummary, inline: false },
            {
              name: 'Responsável Técnico',
              value: truncateField(card?.responsavelTecnico) || 'N/A',
              inline: false,
            },
          ]
        : [{ name: 'Card Removido', value: `Card ${Number(cardIndex) + 1} foi removido`, inline: false }],
    timestamp: new Date().toISOString(),
  };
}

async function appendRemoteAttachment({ item, kind, attachmentIndex, formData, attachments }) {
  if (Number(item.size || 0) > DISCORD_MAX_UPLOAD_BYTES) {
    throw new Error(`Arquivo ${item.name || 'sem nome'} excede o limite de 10 MB do Discord.`);
  }

  const response = await fetch(item.url);
  if (!response.ok) {
    throw new Error(`Nao foi possivel ler a evidência temporária ${item.name || item.url}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const blob = new Blob([buffer], { type: item.type || response.headers.get('content-type') || 'application/octet-stream' });
  const fileName = safeFileName(item.name || `arquivo-${attachmentIndex + 1}`);
  formData.append(`files[${attachmentIndex}]`, blob, fileName);
  attachments.push({
    id: attachmentIndex,
    filename: fileName,
    description: `${kind} ${attachmentIndex + 1}`,
  });

  return attachmentIndex + 1;
}

async function appendLocalAttachment({ file, fallbackName, description, attachmentIndex, formData, attachments }) {
  const buffer = await fs.readFile(file.filepath);
  const blob = new Blob([buffer], {
    type: file.mimetype || 'application/octet-stream',
  });
  const fileName = safeFileName(file.originalFilename || fallbackName);
  formData.append(`files[${attachmentIndex}]`, blob, fileName);
  attachments.push({
    id: attachmentIndex,
    filename: fileName,
    description,
  });

  return attachmentIndex + 1;
}

function normalizeRemoteUploads(items) {
  return Array.isArray(items) ? items.filter((item) => item?.url) : [];
}

function collectCleanupTargets(media) {
  return []
    .concat(normalizeRemoteUploads(media?.photos))
    .concat(normalizeRemoteUploads(media?.videos))
    .map((item) => item.pathname || item.url)
    .filter(Boolean);
}

async function cleanupBlobTargets(targets) {
  if (!targets.length) return;
  try {
    await del(targets);
  } catch (error) {
    console.error('Falha ao limpar blobs temporários:', error);
  }
}

function parseWebhookUrl(value) {
  const url = new URL(value);
  const segments = url.pathname.split('/').filter(Boolean);
  const webhookIndex = segments.findIndex((segment) => segment === 'webhooks');
  const webhookId = segments[webhookIndex + 1];
  const webhookToken = segments[webhookIndex + 2];

  if (!webhookId || !webhookToken) {
    throw new Error('DISCORD_WEBHOOK_URL inválida.');
  }

  return {
    executeUrl: `${url.origin}/api/webhooks/${webhookId}/${webhookToken}`,
    messagesUrl: `${url.origin}/api/webhooks/${webhookId}/${webhookToken}/messages`,
  };
}

async function parseDiscordResponse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function safeFileName(value) {
  return String(value || 'arquivo')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-');
}

function truncateField(value) {
  if (!value) return '';
  const text = String(value);
  return text.length > 1024 ? `${text.slice(0, 1021)}...` : text;
}
