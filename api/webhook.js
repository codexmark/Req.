import formidable from 'formidable';
import fs from 'node:fs/promises';

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
    const { card = {}, action = 'create', cardIndex = null, files = {} } = payload;
    const discordPayload = await buildDiscordPayload({ card, action, cardIndex, files });

    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers:
        typeof discordPayload === 'string'
          ? { 'Content-Type': 'application/json' }
          : undefined,
      body: discordPayload,
    });

    if (!discordResponse.ok) {
      const errorBody = await discordResponse.text();
      console.error('Discord webhook failed', discordResponse.status, errorBody);
      return res.status(500).json({ error: 'Webhook failed' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Internal webhook error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function readRequestPayload(req) {
  const contentType = String(req.headers['content-type'] || '');

  if (contentType.includes('multipart/form-data')) {
    return parseMultipartRequest(req);
  }

  return {
    ...(req.body || {}),
    files: {},
  };
}

async function parseMultipartRequest(req) {
  const form = formidable({
    multiples: true,
    maxFiles: 4,
    maxFileSize: 2 * 1024 * 1024,
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
  const videos = asArray(files.evidenceVideo).filter(Boolean);

  return {
    evidencePhotos: photos,
    evidenceVideo: videos[0] || null,
  };
}

async function buildDiscordPayload({ card, action, cardIndex, files }) {
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
    card?.evidenciaVideo ? '1 vídeo' : '0 vídeo',
  ].join(' • ');

  const embed = {
    title: titles[action] || 'Card Modificado',
    color: colors[action] || 0x37b7a5,
    fields:
      action !== 'delete'
        ? [
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
              name: 'Responsável Técnico',
              value: truncateField(card?.responsavelTecnico) || 'N/A',
              inline: false,
            },
            {
              name: 'Critérios de Aceite',
              value: truncateField(card?.criteriosAceite?.length ? card.criteriosAceite.join('\n') : 'Nenhum'),
              inline: false,
            },
            { name: 'Observação', value: truncateField(card?.observacao) || 'N/A', inline: false },
            { name: 'Evidências', value: mediaSummary, inline: false },
          ]
        : [{ name: 'Card Removido', value: `Card ${Number(cardIndex) + 1} foi removido`, inline: false }],
    timestamp: new Date().toISOString(),
  };

  if (action === 'delete') {
    return JSON.stringify({ embeds: [embed] });
  }

  const hasFiles = (files.evidencePhotos || []).length > 0 || Boolean(files.evidenceVideo);
  if (!hasFiles) {
    return JSON.stringify({ embeds: [embed] });
  }

  const formData = new FormData();
  const attachments = [];
  let attachmentIndex = 0;

  for (const photo of files.evidencePhotos || []) {
    const fileName = safeFileName(photo.originalFilename || `foto-${attachmentIndex + 1}.png`);
    const buffer = await fs.readFile(photo.filepath);
    const blob = new Blob([buffer], { type: photo.mimetype || 'image/png' });
    formData.append(`files[${attachmentIndex}]`, blob, fileName);
    attachments.push({
      id: attachmentIndex,
      filename: fileName,
      description: `Foto de evidencia ${attachmentIndex + 1}`,
    });
    attachmentIndex += 1;
  }

  if (files.evidenceVideo) {
    const fileName = safeFileName(files.evidenceVideo.originalFilename || 'evidencia-video.mp4');
    const buffer = await fs.readFile(files.evidenceVideo.filepath);
    const blob = new Blob([buffer], {
      type: files.evidenceVideo.mimetype || 'video/mp4',
    });
    formData.append(`files[${attachmentIndex}]`, blob, fileName);
    attachments.push({
      id: attachmentIndex,
      filename: fileName,
      description: 'Vídeo da evidência',
    });
  }

  formData.append(
    'payload_json',
    JSON.stringify({
      embeds: [embed],
      attachments,
    })
  );

  return formData;
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
