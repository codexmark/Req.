const CARD_STORAGE_KEY = 'createdCards';
const MAX_PHOTOS = 3;
const MAX_IMAGE_BYTES = 500 * 1024;
const MAX_VIDEO_BYTES = Math.floor(1.5 * 1024 * 1024);
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
let videoEvidence = null;
const mediaStore = new Map();

boot();

async function boot() {
  await window.ReqAuth.requireAuth();
  await loadUsers();
  hydrateCards();
  wireEvents();
  renderAcceptanceCriteria();
  renderEvidence();
  renderCreatedCards();
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
    await handleVideoSelection(event.target.files?.[0] || null);
    videoEvidenceInput.value = '';
  });

  photoEvidenceList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-photo-index]');
    if (!button) return;
    const index = Number.parseInt(button.dataset.removePhotoIndex, 10);
    if (Number.isNaN(index)) return;
    revokeMediaUrls([photoEvidence[index]]);
    photoEvidence.splice(index, 1);
    renderEvidence();
  });

  videoEvidenceList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-video]');
    if (!button) return;
    revokeMediaUrls([videoEvidence]);
    videoEvidence = null;
    renderEvidence();
  });

  createCardBtn.addEventListener('click', onSubmitCard);
  clearCardFormBtn.addEventListener('click', () => clearForm());
  createdCardsList.addEventListener('click', onCardsListClick);

  window.addEventListener('beforeunload', () => {
    revokeMediaUrls(photoEvidence);
    revokeMediaUrls([videoEvidence]);
    for (const media of mediaStore.values()) {
      revokeMediaUrls(media.photos);
      revokeMediaUrls([media.video]);
    }
  });
}

async function loadUsers() {
  const payload = await window.ReqAuth.getUsers();
  usersDirectory = payload.users || [];
  renderResponsavelOptions();
}

function hydrateCards() {
  createdCards = createdCards.map((card) => ({
    ...card,
    localId: card.localId || crypto.randomUUID(),
    evidenciasFotos: normalizeEvidenceMetadata(card.evidenciasFotos),
    evidenciaVideo: normalizeSingleEvidenceMetadata(card.evidenciaVideo),
  }));
  persistCards();
}

function normalizeEvidenceMetadata(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id || crypto.randomUUID(),
        name: item.name || 'arquivo',
        type: item.type || '',
        size: Number(item.size || 0),
      }))
    : [];
}

function normalizeSingleEvidenceMetadata(item) {
  if (!item) return null;
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || 'arquivo',
    type: item.type || '',
    size: Number(item.size || 0),
  };
}

function renderResponsavelOptions(selectedId = '') {
  responsavelTecnicoSelect.innerHTML = ['<option value="">Selecione um usuario</option>']
    .concat(usersDirectory.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`))
    .join('');
  responsavelTecnicoSelect.value = selectedId || '';
}

async function sendToDiscord(card, media, action = 'create', cardIndex = null) {
  try {
    if (action === 'delete') {
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card, action, cardIndex }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setFeedback('Card removido e webhook notificado.', 'success');
      return true;
    }

    const formData = new FormData();
    formData.append(
      'payload',
      JSON.stringify({
        card,
        action,
        cardIndex,
      })
    );

    for (const item of media.photos) {
      formData.append('evidencePhotos', item.file, item.name);
    }

    if (media.video?.file) {
      formData.append('evidenceVideo', media.video.file, media.video.name);
    }

    const response = await fetch('/api/webhook', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    setFeedback('Card sincronizado com o webhook do Discord.', 'success');
    return true;
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error);
    setFeedback(
      'Nao foi possivel notificar o Discord. O card textual foi salvo e as evidencias permanecem nesta aba.',
      'error'
    );
    return false;
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
    const hasVideo = Boolean(card.evidenciaVideo);
    const sessionMedia = mediaStore.get(card.localId);
    const needsReattach = (photoCount || hasVideo) && !sessionMedia;

    cardElement.className = 'created-card';
    cardElement.innerHTML = `
      <div class="actions">
        <button class="button secondary edit-card" data-id="${index}">Editar</button>
        <button class="button danger-light delete-card" data-id="${index}">Excluir</button>
      </div>
      <h3>Card ${index + 1}</h3>
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
        <ul>${card.criteriosAceite.map((criterion) => `<li>${escapeHtml(criterion)}</li>`).join('')}</ul>
      </div>
      <div class="card-section">
        <strong>Evidências:</strong>
        <div class="media-chip-row">
          <span class="evidence-chip">${photoCount} foto(s)</span>
          <span class="evidence-chip">${hasVideo ? '1 vídeo' : '0 vídeo'}</span>
          ${needsReattach ? '<span class="evidence-chip">reanexar na próxima edição</span>' : ''}
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
  videoEvidenceEmpty.hidden = Boolean(videoEvidence);

  addPhotoTrigger.textContent = photoEvidence.length ? 'Adicionar mais fotos' : 'Selecionar fotos';
  addPhotoTrigger.disabled = photoEvidence.length >= MAX_PHOTOS;
  addVideoTrigger.textContent = videoEvidence ? 'Substituir vídeo' : 'Selecionar vídeo';

  photoEvidence.forEach((item, index) => {
    const node = document.createElement('article');
    node.className = 'evidence-item';
    node.innerHTML = `
      <img src="${item.previewUrl}" alt="${escapeHtml(item.name)}" />
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

  if (videoEvidence) {
    const node = document.createElement('article');
    node.className = 'video-preview-card';
    node.innerHTML = `
      <video controls preload="metadata" src="${videoEvidence.previewUrl}"></video>
      <div class="video-preview-card__meta">
        <div>
          <div class="evidence-item__name">${escapeHtml(videoEvidence.name)}</div>
          <span>${formatFileSize(videoEvidence.size)}</span>
        </div>
        <button class="button danger-light" type="button" data-remove-video>
          Remover
        </button>
      </div>
    `;
    videoEvidenceList.appendChild(node);
  }

  if (evidenceSessionNote) {
    evidenceSessionNote.textContent = editingCardId !== null && !hasCurrentSessionMedia()
      ? 'As evidências anteriores não estão mais nesta aba. Reanexe os arquivos antes de reenviar.'
      : 'As evidências ficam disponíveis nesta aba até o envio. Se a página recarregar, reanexe os arquivos.';
    evidenceSessionNote.className = `form-feedback full-span ${editingCardId !== null && !hasCurrentSessionMedia() ? 'is-error' : 'is-info'}`;
  }
}

function clearForm(options = {}) {
  const { keepFeedback = false, preserveStoredMedia = false } = options;
  if (!preserveStoredMedia) {
    revokeMediaUrls(photoEvidence);
    revokeMediaUrls([videoEvidence]);
  }

  cardForm.reset();
  acceptanceCriteria = [];
  photoEvidence = [];
  videoEvidence = null;
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

  const formData = new FormData(cardForm);
  const responsavelTecnicoId = String(formData.get('responsavelTecnicoId') || '');
  const responsavel = usersDirectory.find((user) => user.id === responsavelTecnicoId);
  const localId = editingCardId !== null ? createdCards[editingCardId].localId : crypto.randomUUID();
  const card = {
    localId,
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
    evidenciasFotos: photoEvidence.map(toEvidenceMetadata),
    evidenciaVideo: videoEvidence ? toEvidenceMetadata(videoEvidence) : null,
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

  const currentMedia = {
    photos: cloneMediaForStore(photoEvidence),
    video: videoEvidence ? cloneMediaForStore([videoEvidence])[0] : null,
  };

  if (editingCardId !== null) {
    replaceStoredMedia(localId, currentMedia);
    createdCards[editingCardId] = card;
    persistCards();
    await sendToDiscord(stripEvidencePayload(card), currentMedia, 'update', editingCardId);
  } else {
    replaceStoredMedia(localId, currentMedia);
    createdCards.push(card);
    persistCards();
    await sendToDiscord(stripEvidencePayload(card), currentMedia, 'create', createdCards.length - 1);
  }

  renderCreatedCards();
  clearForm({ keepFeedback: true, preserveStoredMedia: true });
}

function onCardsListClick(event) {
  if (event.target.classList.contains('edit-card')) {
    const id = Number.parseInt(event.target.dataset.id, 10);
    const card = createdCards[id];
    if (!card) return;

    clearForm({ preserveStoredMedia: false });

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

    const sessionMedia = mediaStore.get(card.localId);
    photoEvidence = sessionMedia ? cloneMediaForEditing(sessionMedia.photos) : [];
    videoEvidence = sessionMedia?.video ? cloneMediaForEditing([sessionMedia.video])[0] : null;

    renderAcceptanceCriteria();
    renderEvidence();
    createCardBtn.textContent = 'Salvar Edição';
    setFeedback(
      sessionMedia
        ? 'Card carregado para edicao.'
        : 'Card carregado. Reanexe as evidências se quiser reenviar mídia ao Discord.',
      sessionMedia ? 'info' : 'error'
    );
    cardForm.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (event.target.classList.contains('delete-card')) {
    const id = Number.parseInt(event.target.dataset.id, 10);
    if (!window.confirm('Tem certeza que deseja excluir este card?')) return;

    const cardToDelete = createdCards[id];
    createdCards.splice(id, 1);
    dropStoredMedia(cardToDelete.localId);
    persistCards();
    renderCreatedCards();
    sendToDiscord(stripEvidencePayload(cardToDelete), { photos: [], video: null }, 'delete', id);
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

  const nextItems = [];
  for (const file of files) {
    const validationError = validateMediaFile(file, 'photo');
    if (validationError) {
      setFeedback(validationError, 'error');
      return;
    }
    nextItems.push(createMediaItem(file, 'photo'));
  }

  photoEvidence = photoEvidence.concat(nextItems);
  renderEvidence();
  setFeedback('Fotos carregadas nesta aba e prontas para envio.', 'info');
}

async function handleVideoSelection(file) {
  if (!file) return;
  const validationError = validateMediaFile(file, 'video');
  if (validationError) {
    setFeedback(validationError, 'error');
    return;
  }

  revokeMediaUrls([videoEvidence]);
  videoEvidence = createMediaItem(file, 'video');
  renderEvidence();
  setFeedback('Vídeo carregado nesta aba e pronto para envio.', 'info');
}

function createMediaItem(file, kind) {
  return {
    id: crypto.randomUUID(),
    kind,
    name: file.name,
    type: file.type,
    size: file.size,
    file,
    previewUrl: URL.createObjectURL(file),
  };
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
    return `O vídeo deve ter no maximo ${formatFileSize(MAX_VIDEO_BYTES)}.`;
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

function stripEvidencePayload(card) {
  return {
    ...card,
    evidenciasFotos: normalizeEvidenceMetadata(card.evidenciasFotos),
    evidenciaVideo: normalizeSingleEvidenceMetadata(card.evidenciaVideo),
  };
}

function toEvidenceMetadata(item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    size: item.size,
  };
}

function cloneMediaForStore(items) {
  return items.filter(Boolean).map((item) => ({
    ...item,
  }));
}

function cloneMediaForEditing(items) {
  return items.filter(Boolean).map((item) => ({
    ...item,
    previewUrl: item.file ? URL.createObjectURL(item.file) : item.previewUrl,
  }));
}

function replaceStoredMedia(localId, media) {
  dropStoredMedia(localId);
  mediaStore.set(localId, media);
}

function dropStoredMedia(localId) {
  const existing = mediaStore.get(localId);
  if (!existing) return;
  revokeMediaUrls(existing.photos);
  revokeMediaUrls([existing.video]);
  mediaStore.delete(localId);
}

function revokeMediaUrls(items) {
  items.filter(Boolean).forEach((item) => {
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

function hasCurrentSessionMedia() {
  return photoEvidence.length > 0 || Boolean(videoEvidence);
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
