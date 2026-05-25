const CARD_STORAGE_KEY = 'createdCards';
const MAX_PHOTOS = 5;
const MAX_VIDEOS = 2;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
const MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

const cardForm = document.getElementById('card-form');
const createCardBtn = document.getElementById('create-card');
const clearCardFormBtn = document.getElementById('clear-card-form');
const createdCardsList = document.getElementById('created-cards');
const addCriterionBtn = document.getElementById('add-criterion');
const newCriterionInput = document.getElementById('new-criterion');
const acceptanceCriteriaList = document.getElementById('acceptance-criteria-list');
const cardFeedback = document.getElementById('card-feedback');
const evidenceSessionNote = document.getElementById('evidence-session-note');
const responsavelTecnicoSelect = cardForm.elements.responsavelTecnicoId;
const addPhotoTrigger = document.getElementById('add-photo-trigger');
const addVideoTrigger = document.getElementById('add-video-trigger');
const photoEvidenceInput = document.getElementById('photo-evidence-input');
const videoEvidenceInput = document.getElementById('video-evidence-input');
const photoEvidenceList = document.getElementById('photo-evidence-list');
const videoEvidenceList = document.getElementById('video-evidence-list');
const photoEvidenceEmpty = document.getElementById('photo-evidence-empty');
const videoEvidenceEmpty = document.getElementById('video-evidence-empty');

let createdCards = safeLoadCards();
let editingCardId = null;
let acceptanceCriteria = [];
let usersDirectory = [];
let photoEvidence = [];
let videoEvidence = [];
let blobUpload;
let uploadInFlight = 0;

boot();

async function boot() {
  await window.ReqAuth.requireAuth();
  await ensureBlobUpload();
  await loadUsers();
  hydrateCards();
  wireEvents();
  renderAcceptanceCriteria();
  renderEvidence();
  renderCreatedCards();
}

async function ensureBlobUpload() {
  if (blobUpload) return blobUpload;
  const client = await import('https://esm.sh/@vercel/blob@2.4.0/client');
  blobUpload = client.upload;
  return blobUpload;
}

function wireEvents() {
  addCriterionBtn.addEventListener('click', () => {
    const text = newCriterionInput.value.trim();
    if (!text) return;
    acceptanceCriteria.push(text);
    newCriterionInput.value = '';
    renderAcceptanceCriteria();
  });

  newCriterionInput.addEventListener('keypress', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCriterionBtn.click();
  });

  acceptanceCriteriaList.addEventListener('click', (event) => {
    if (!event.target.classList.contains('remove-criterion')) return;
    const index = Number.parseInt(event.target.dataset.index, 10);
    if (Number.isNaN(index)) return;
    acceptanceCriteria.splice(index, 1);
    renderAcceptanceCriteria();
  });

  addPhotoTrigger.addEventListener('click', () => photoEvidenceInput.click());
  addVideoTrigger.addEventListener('click', () => videoEvidenceInput.click());

  photoEvidenceInput.addEventListener('change', async (event) => {
    await handlePhotoSelection(event.target.files);
    photoEvidenceInput.value = '';
  });

  videoEvidenceInput.addEventListener('change', async (event) => {
    await handleVideoSelection(event.target.files);
    videoEvidenceInput.value = '';
  });

  photoEvidenceList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-photo-index]');
    if (!button) return;
    const index = Number.parseInt(button.dataset.removePhotoIndex, 10);
    if (Number.isNaN(index)) return;
    const [removed] = photoEvidence.splice(index, 1);
    renderEvidence();
    await cleanupTempMedia([removed]);
  });

  videoEvidenceList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-video-index]');
    if (!button) return;
    const index = Number.parseInt(button.dataset.removeVideoIndex, 10);
    if (Number.isNaN(index)) return;
    const [removed] = videoEvidence.splice(index, 1);
    renderEvidence();
    await cleanupTempMedia([removed]);
  });

  createCardBtn.addEventListener('click', onSubmitCard);
  clearCardFormBtn.addEventListener('click', async () => {
    await clearForm({ deleteDraftUploads: editingCardId === null });
  });
  createdCardsList.addEventListener('click', onCardsListClick);
}

async function loadUsers() {
  const payload = await window.ReqAuth.getUsers();
  usersDirectory = payload.users || [];
  renderResponsavelOptions();
}

function hydrateCards() {
  createdCards = createdCards.map((card) => normalizeStoredCard(card));
  persistCards();
}

function normalizeStoredCard(card) {
  const evidenciasFotos = normalizeEvidenceArray(card.evidenciasFotos);
  const evidenciasVideos = normalizeEvidenceArray(
    card.evidenciasVideos || (card.evidenciaVideo ? [card.evidenciaVideo] : [])
  );

  return {
    ...card,
    localId: card.localId || crypto.randomUUID(),
    cardId: card.cardId || createCardIdentifier(),
    discordMessageId: card.discordMessageId || null,
    criteriosAceite: Array.isArray(card.criteriosAceite) ? card.criteriosAceite : [],
    evidenciasFotos,
    evidenciasVideos,
  };
}

function normalizeEvidenceArray(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id || crypto.randomUUID(),
        name: item.name || 'arquivo',
        type: item.type || '',
        size: Number(item.size || 0),
        url: item.url || item.downloadUrl || '',
        pathname: item.pathname || '',
      }))
    : [];
}

function renderResponsavelOptions(selectedId = '') {
  responsavelTecnicoSelect.innerHTML = ['<option value="">Selecione um usuario</option>']
    .concat(usersDirectory.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`))
    .join('');
  responsavelTecnicoSelect.value = selectedId || '';
}

async function sendToDiscord(card, action = 'create', cardIndex = null) {
  try {
    const response = await fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card,
        action,
        cardIndex,
        media: collectPendingMedia(card),
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = await response.json().catch(() => ({}));

    if (action === 'delete') {
      setFeedback('Card removido e webhook notificado.', 'success');
    } else {
      setFeedback('Card sincronizado com o webhook do Discord.', 'success');
    }
    return {
      success: true,
      discordMessageId: payload.discordMessageId || null,
    };
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error);
    setFeedback(
      action === 'delete'
        ? 'Nao foi possivel notificar o Discord sobre a exclusao.'
        : 'Nao foi possivel notificar o Discord. O card foi salvo e as evidencias temporarias permanecem disponiveis para retry.',
      'error'
    );
    return {
      success: false,
      discordMessageId: null,
    };
  }
}

function renderCreatedCards() {
  createdCardsList.innerHTML = '';

  if (!createdCards.length) {
    createdCardsList.innerHTML = `
      <div class="created-card created-card--empty">
        <h3>Nenhum card criado ainda</h3>
        <p>Preencha o formulario, monte os criterios e salve para iniciar sua fila de cards.</p>
      </div>
    `;
    return;
  }

  createdCards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    const photoCount = card.evidenciasFotos.length;
    const videoCount = card.evidenciasVideos.length;
    const needsReattach = hasAnyEvidence(card) && !hasPendingBlobMedia(card);

    cardElement.className = 'created-card';
    cardElement.innerHTML = `
      <div class="actions">
        <button class="button secondary edit-card" data-id="${index}">Editar</button>
        <button class="button danger-light delete-card" data-id="${index}">Excluir</button>
      </div>
      <h3>Card ${index + 1}</h3>
      <div class="card-section">
        <strong>ID do Card:</strong> <p>${escapeHtml(card.cardId || 'N/A')}</p>
      </div>
      <div class="card-section">
        <strong>Mensagem Discord:</strong> <p>${escapeHtml(card.discordMessageId || 'Ainda não vinculada')}</p>
      </div>
      <div class="card-section">
        <strong>Contexto:</strong> <p>${escapeHtml(card.contexto || 'N/A')}</p>
      </div>
      <div class="card-section">
        <strong>Comportamento Atual:</strong> <p>${escapeHtml(card.comportamentoAtual || 'N/A')}</p>
      </div>
      <div class="card-section">
        <strong>Comportamento Esperado:</strong> <p>${escapeHtml(card.comportamentoEsperado || 'N/A')}</p>
      </div>
      <div class="card-section">
        <strong>Regras de Negócio:</strong> <p>${escapeHtml(card.regrasNegocio || 'N/A')}</p>
      </div>
      <div class="card-section">
        <strong>Responsavel Tecnico:</strong> <p>${escapeHtml(card.responsavelTecnico || 'Nao definido')}</p>
      </div>
      <div class="card-section">
        <strong>Tipo:</strong> <p>${escapeHtml(card.tipo || 'Nao definido')}</p>
      </div>
      <div class="card-section">
        <strong>Prioridade:</strong> <p>${escapeHtml(card.prioridade || 'Nao definida')}</p>
      </div>
      <div class="card-section">
        <strong>Origem da Demanda:</strong> <p>${escapeHtml(card.origemDemanda || 'Nao informada')}</p>
      </div>
      <div class="card-section">
        <strong>Impacto:</strong> <p>${escapeHtml(card.impacto || 'Nao informado')}</p>
      </div>
      <div class="card-section">
        <strong>Critérios de Aceite:</strong>
        <ul>${(card.criteriosAceite || []).map((criterion) => `<li>${escapeHtml(criterion)}</li>`).join('')}</ul>
      </div>
      <div class="card-section">
        <strong>Evidências:</strong>
        <div class="media-chip-row">
          <span class="evidence-chip">${photoCount} foto(s)</span>
          <span class="evidence-chip">${videoCount} vídeo(s)</span>
          ${needsReattach ? '<span class="evidence-chip">reanexar para reenviar</span>' : ''}
        </div>
      </div>
      ${card.observacao ? `<div class="card-section"><strong>Observação:</strong> <p>${escapeHtml(card.observacao)}</p></div>` : ''}
    `;
    createdCardsList.appendChild(cardElement);
  });
}

function renderAcceptanceCriteria() {
  acceptanceCriteriaList.innerHTML = '';
  acceptanceCriteria.forEach((criterion, index) => {
    const item = document.createElement('div');
    item.className = 'criterion-item';
    item.innerHTML = `
      <span class="text">${index + 1}. ${escapeHtml(criterion)}</span>
      <button class="remove-criterion" data-index="${index}">&times;</button>
    `;
    acceptanceCriteriaList.appendChild(item);
  });
}

function renderEvidence() {
  photoEvidenceList.innerHTML = '';
  videoEvidenceList.innerHTML = '';

  photoEvidenceEmpty.hidden = photoEvidence.length > 0;
  videoEvidenceEmpty.hidden = videoEvidence.length > 0;

  addPhotoTrigger.textContent = photoEvidence.length ? 'Adicionar mais fotos' : 'Selecionar fotos';
  addPhotoTrigger.disabled = photoEvidence.length >= MAX_PHOTOS || uploadInFlight > 0;
  addVideoTrigger.textContent = videoEvidence.length ? 'Adicionar mais vídeos' : 'Selecionar vídeo';
  addVideoTrigger.disabled = videoEvidence.length >= MAX_VIDEOS || uploadInFlight > 0;
  createCardBtn.disabled = uploadInFlight > 0;

  photoEvidence.forEach((item, index) => {
    const node = document.createElement('article');
    node.className = 'evidence-item';
    node.innerHTML = `
      <img src="${item.url}" alt="${escapeHtml(item.name)}" />
      <div class="evidence-item__meta">
        <div>
          <div class="evidence-item__name">${escapeHtml(item.name)}</div>
          <span>${formatFileSize(item.size)}</span>
        </div>
        <button class="button danger-light" type="button" data-remove-photo-index="${index}">
          Remover
        </button>
      </div>
    `;
    photoEvidenceList.appendChild(node);
  });

  videoEvidence.forEach((item, index) => {
    const node = document.createElement('article');
    node.className = 'video-preview-card';
    node.innerHTML = `
      <video controls preload="metadata" src="${item.url}"></video>
      <div class="video-preview-card__meta">
        <div>
          <div class="evidence-item__name">${escapeHtml(item.name)}</div>
          <span>${formatFileSize(item.size)}</span>
        </div>
        <button class="button danger-light" type="button" data-remove-video-index="${index}">
          Remover
        </button>
      </div>
    `;
    videoEvidenceList.appendChild(node);
  });

  if (evidenceSessionNote) {
    const hasPendingMedia = photoEvidence.length > 0 || videoEvidence.length > 0;
    if (uploadInFlight > 0) {
      evidenceSessionNote.textContent = 'Enviando evidências temporárias para o Blob. Aguarde concluir antes de salvar o card.';
      evidenceSessionNote.className = 'form-feedback full-span is-info';
    } else if (editingCardId !== null && !hasPendingMedia) {
      evidenceSessionNote.textContent = 'As evidências anteriores já foram enviadas ou removidas. Reanexe arquivos se quiser reenviar mídia ao Discord.';
      evidenceSessionNote.className = 'form-feedback full-span is-info';
    } else {
      evidenceSessionNote.textContent = 'As evidências ficam temporariamente no Blob até o envio ao Discord. Depois disso, os arquivos são apagados automaticamente.';
      evidenceSessionNote.className = 'form-feedback full-span is-info';
    }
  }
}

async function clearForm(options = {}) {
  const { keepFeedback = false, deleteDraftUploads = false } = options;
  if (deleteDraftUploads) {
    await cleanupTempMedia(photoEvidence);
    await cleanupTempMedia(videoEvidence);
  }

  cardForm.reset();
  acceptanceCriteria = [];
  photoEvidence = [];
  videoEvidence = [];
  editingCardId = null;
  renderAcceptanceCriteria();
  renderEvidence();
  renderResponsavelOptions();
  createCardBtn.textContent = 'Criar Card';

  if (!keepFeedback) {
    setFeedback('');
  }
}

async function onSubmitCard(event) {
  event.preventDefault();

  if (uploadInFlight > 0) {
    setFeedback('Aguarde terminar o upload das evidências antes de criar o card.', 'error');
    return;
  }

  const formData = new FormData(cardForm);
  const responsavelTecnicoId = String(formData.get('responsavelTecnicoId') || '');
  const responsavel = usersDirectory.find((user) => user.id === responsavelTecnicoId);
  const localId = editingCardId !== null ? createdCards[editingCardId].localId : crypto.randomUUID();
  const card = {
    localId,
    cardId: editingCardId !== null ? createdCards[editingCardId].cardId : createCardIdentifier(),
    discordMessageId: editingCardId !== null ? createdCards[editingCardId].discordMessageId || null : null,
    tipo: String(formData.get('tipo') || '').trim(),
    prioridade: String(formData.get('prioridade') || '').trim(),
    origemDemanda: String(formData.get('origemDemanda') || '').trim(),
    impacto: String(formData.get('impacto') || '').trim(),
    contexto: String(formData.get('contexto') || '').trim(),
    comportamentoAtual: String(formData.get('comportamentoAtual') || '').trim(),
    comportamentoEsperado: String(formData.get('comportamentoEsperado') || '').trim(),
    regrasNegocio: String(formData.get('regrasNegocio') || '').trim(),
    responsavelTecnicoId,
    responsavelTecnico: responsavel?.name || '',
    criteriosAceite: [...acceptanceCriteria],
    observacao: String(formData.get('observacao') || '').trim(),
    evidenciasFotos: cloneEvidenceArray(photoEvidence),
    evidenciasVideos: cloneEvidenceArray(videoEvidence),
  };

  if (
    !card.contexto &&
    !card.comportamentoAtual &&
    !card.comportamentoEsperado &&
    !card.regrasNegocio &&
    card.criteriosAceite.length === 0
  ) {
    setFeedback('Preencha pelo menos um campo relevante antes de criar o card.', 'error');
    return;
  }

  let cardIndex = editingCardId;

  if (editingCardId !== null) {
    createdCards[editingCardId] = card;
  } else {
    createdCards.push(card);
    cardIndex = createdCards.length - 1;
  }

  persistCards();
  const result = await sendToDiscord(card, editingCardId !== null ? 'update' : 'create', cardIndex);

  if (result.success) {
    createdCards[cardIndex] = {
      ...stripTemporaryBlobRefs(card),
      discordMessageId: result.discordMessageId || card.discordMessageId || null,
    };
    persistCards();
  }

  renderCreatedCards();
  await clearForm({ keepFeedback: true, deleteDraftUploads: false });
}

async function onCardsListClick(event) {
  if (event.target.classList.contains('edit-card')) {
    const id = Number.parseInt(event.target.dataset.id, 10);
    const card = createdCards[id];
    if (!card) return;

    await clearForm({ deleteDraftUploads: editingCardId === null });

    editingCardId = id;
    cardForm.contexto.value = card.contexto || '';
    cardForm.comportamentoAtual.value = card.comportamentoAtual || '';
    cardForm.comportamentoEsperado.value = card.comportamentoEsperado || '';
    cardForm.regrasNegocio.value = card.regrasNegocio || '';
    cardForm.tipo.value = card.tipo || '';
    cardForm.prioridade.value = card.prioridade || '';
    cardForm.origemDemanda.value = card.origemDemanda || '';
    cardForm.impacto.value = card.impacto || '';
    renderResponsavelOptions(card.responsavelTecnicoId || '');
    cardForm.observacao.value = card.observacao || '';
    acceptanceCriteria = [...(card.criteriosAceite || [])];
    photoEvidence = cloneEvidenceArray(card.evidenciasFotos);
    videoEvidence = cloneEvidenceArray(card.evidenciasVideos);

    renderAcceptanceCriteria();
    renderEvidence();
    createCardBtn.textContent = 'Salvar Edição';
    setFeedback(
      hasPendingBlobMedia(card)
        ? 'Card carregado para edicao. As evidências temporárias ainda podem ser reenviadas.'
        : 'Card carregado. Reanexe as evidências se quiser reenviar mídia ao Discord.',
      'info'
    );
    cardForm.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (event.target.classList.contains('delete-card')) {
    const id = Number.parseInt(event.target.dataset.id, 10);
    if (!window.confirm('Tem certeza que deseja excluir este card?')) return;

    const cardToDelete = createdCards[id];
    createdCards.splice(id, 1);
    persistCards();
    renderCreatedCards();

    await cleanupTempMedia(cardToDelete.evidenciasFotos);
    await cleanupTempMedia(cardToDelete.evidenciasVideos);
    await sendToDiscord(stripTemporaryBlobRefs(cardToDelete), 'delete', id);

    setFeedback('Card removido da fila local.', 'info');
  }
}

async function handlePhotoSelection(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  if (photoEvidence.length + files.length > MAX_PHOTOS) {
    setFeedback(`Voce pode anexar no maximo ${MAX_PHOTOS} fotos por card.`, 'error');
    return;
  }

  for (const file of files) {
    const validationError = validateMediaFile(file, 'photo');
    if (validationError) {
      setFeedback(validationError, 'error');
      return;
    }
  }

  for (const file of files) {
    const uploaded = await uploadEvidenceFile(file, 'photo');
    if (!uploaded) return;
    photoEvidence.push(uploaded);
    renderEvidence();
  }

  setFeedback('Fotos enviadas para o armazenamento temporario e prontas para o card.', 'success');
}

async function handleVideoSelection(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  if (videoEvidence.length + files.length > MAX_VIDEOS) {
    setFeedback(`Voce pode anexar no maximo ${MAX_VIDEOS} vídeos por card.`, 'error');
    return;
  }

  for (const file of files) {
    const validationError = validateMediaFile(file, 'video');
    if (validationError) {
      setFeedback(validationError, 'error');
      return;
    }
  }

  for (const file of files) {
    const uploaded = await uploadEvidenceFile(file, 'video');
    if (!uploaded) return;
    videoEvidence.push(uploaded);
    renderEvidence();
  }

  setFeedback('Vídeos enviados para o armazenamento temporario e prontos para o card.', 'success');
}

async function uploadEvidenceFile(file, kind) {
  uploadInFlight += 1;
  renderEvidence();
  setFeedback(`Enviando ${kind === 'photo' ? 'foto' : 'vídeo'} temporariamente para o Blob...`, 'info');

  try {
    const uploadClient = await ensureBlobUpload();
    const pathname = `cards-temp/${kind}/${Date.now()}-${safeFileName(file.name)}`;
    const blob = await uploadClient(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/blob/upload',
      multipart: file.size > MULTIPART_THRESHOLD_BYTES,
      clientPayload: JSON.stringify({
        kind,
        contentType: file.type,
      }),
    });

    return {
      id: crypto.randomUUID(),
      kind,
      name: file.name,
      type: file.type,
      size: file.size,
      url: blob.url,
      pathname: blob.pathname,
    };
  } catch (error) {
    console.error('Falha no upload temporario:', error);
    setFeedback('Nao foi possivel enviar a evidência para o armazenamento temporario.', 'error');
    return null;
  } finally {
    uploadInFlight = Math.max(0, uploadInFlight - 1);
    renderEvidence();
  }
}

function validateMediaFile(file, kind) {
  if (kind === 'photo') {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Formato de foto nao suportado. Envie PNG, JPG ou WEBP.';
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `Cada foto deve ter no maximo ${formatFileSize(MAX_IMAGE_BYTES)}.`;
    }
    return '';
  }

  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return 'Formato de vídeo nao suportado. Envie MP4 ou WEBM.';
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `Cada vídeo deve ter no maximo ${formatFileSize(MAX_VIDEO_BYTES)}.`;
  }
  return '';
}

function safeLoadCards() {
  try {
    const raw = localStorage.getItem(CARD_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Falha ao carregar cards locais:', error);
    return [];
  }
}

function createCardIdentifier() {
  return `CRD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function persistCards() {
  try {
    localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(createdCards));
  } catch (error) {
    console.error('Falha ao persistir cards locais:', error);
    setFeedback(
      'Nao foi possivel salvar o card localmente neste navegador. Revise o tamanho do conteúdo.',
      'error'
    );
  }
}

function stripTemporaryBlobRefs(card) {
  return {
    ...card,
    evidenciasFotos: card.evidenciasFotos.map(toPersistedEvidenceMetadata),
    evidenciasVideos: card.evidenciasVideos.map(toPersistedEvidenceMetadata),
  };
}

function toPersistedEvidenceMetadata(item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
  };
}

function cloneEvidenceArray(items) {
  return items.filter(Boolean).map((item) => ({ ...item }));
}

function collectPendingMedia(card) {
  return {
    photos: card.evidenciasFotos.filter(hasBlobTarget).map(toRemoteUploadDescriptor),
    videos: card.evidenciasVideos.filter(hasBlobTarget).map(toRemoteUploadDescriptor),
  };
}

function toRemoteUploadDescriptor(item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
    url: item.url,
    pathname: item.pathname,
  };
}

function hasBlobTarget(item) {
  return Boolean(item?.url || item?.pathname);
}

function hasPendingBlobMedia(card) {
  return card.evidenciasFotos.some(hasBlobTarget) || card.evidenciasVideos.some(hasBlobTarget);
}

function hasAnyEvidence(card) {
  return card.evidenciasFotos.length > 0 || card.evidenciasVideos.length > 0;
}

async function cleanupTempMedia(items) {
  const targets = items.filter(hasBlobTarget).map((item) => item.pathname || item.url);
  if (!targets.length) return;

  try {
    await fetch('/api/blob/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets }),
    });
  } catch (error) {
    console.error('Falha ao limpar mídia temporária:', error);
  }
}

function setFeedback(message, kind = 'info') {
  if (!cardFeedback) return;
  cardFeedback.textContent = message;
  cardFeedback.className = `form-feedback full-span is-${kind}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function safeFileName(value) {
  return String(value || 'arquivo')
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
