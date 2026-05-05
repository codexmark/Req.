// Card Creator Logic
const cardForm = document.getElementById('card-form');
const createCardBtn = document.getElementById('create-card');
const clearCardFormBtn = document.getElementById('clear-card-form');
const createdCardsList = document.getElementById('created-cards');
const addCriterionBtn = document.getElementById('add-criterion');
const newCriterionInput = document.getElementById('new-criterion');
const acceptanceCriteriaList = document.getElementById('acceptance-criteria-list');
const cardFeedback = document.getElementById('card-feedback');

let createdCards = JSON.parse(localStorage.getItem('createdCards') || '[]');
let editingCardId = null;
let acceptanceCriteria = [];

async function sendToDiscord(card, action = 'create', cardIndex = null) {
  try {
    const response = await fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card, action, cardIndex })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    setFeedback('Card sincronizado com o webhook do Discord.', 'success');
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error);
    setFeedback('Nao foi possivel notificar o Discord. O card foi salvo localmente.', 'error');
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setFeedback(message, kind = 'info') {
  if (!cardFeedback) return;
  cardFeedback.textContent = message;
  cardFeedback.className = `form-feedback full-span is-${kind}`;
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
        <strong>Critérios de Aceite:</strong>
        <ul>${card.criteriosAceite.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
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
      <span class="text">${index + 1}. ${criterion}</span>
      <button class="remove-criterion" data-index="${index}">&times;</button>
    `;
    acceptanceCriteriaList.appendChild(item);
  });
}

function clearForm() {
  cardForm.reset();
  acceptanceCriteria = [];
  renderAcceptanceCriteria();
  editingCardId = null;
  createCardBtn.textContent = 'Criar Card';
  setFeedback('');
}

addCriterionBtn.addEventListener('click', () => {
  const text = newCriterionInput.value.trim();
  if (text) {
    acceptanceCriteria.push(text);
    newCriterionInput.value = '';
    renderAcceptanceCriteria();
  }
});

newCriterionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCriterionBtn.click();
  }
});

acceptanceCriteriaList.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-criterion')) {
    const index = parseInt(e.target.dataset.index);
    acceptanceCriteria.splice(index, 1);
    renderAcceptanceCriteria();
  }
});

createCardBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const formData = new FormData(cardForm);
  const card = {
    contexto: formData.get('contexto'),
    comportamentoAtual: formData.get('comportamentoAtual'),
    comportamentoEsperado: formData.get('comportamentoEsperado'),
    regrasNegocio: formData.get('regrasNegocio'),
    responsavelTecnico: formData.get('responsavelTecnico'),
    criteriosAceite: [...acceptanceCriteria],
    observacao: formData.get('observacao')
  };

  // Basic validation: at least one field filled
  if (!card.contexto && !card.comportamentoAtual && !card.comportamentoEsperado && !card.regrasNegocio && card.criteriosAceite.length === 0) {
    setFeedback('Preencha pelo menos um campo relevante antes de criar o card.', 'error');
    return;
  }

  if (editingCardId !== null) {
    createdCards[editingCardId] = card;
    sendToDiscord(card, 'update', editingCardId);
    editingCardId = null;
    createCardBtn.textContent = 'Criar Card';
    setFeedback('Card atualizado e salvo localmente.', 'success');
  } else {
    createdCards.push(card);
    sendToDiscord(card, 'create', createdCards.length - 1);
    setFeedback('Card criado e salvo localmente.', 'success');
  }

  localStorage.setItem('createdCards', JSON.stringify(createdCards));
  renderCreatedCards();
  clearForm();
});

clearCardFormBtn.addEventListener('click', () => {
  clearForm();
});

createdCardsList.addEventListener('click', (e) => {
  if (e.target.classList.contains('edit-card')) {
    const id = parseInt(e.target.dataset.id);
    const card = createdCards[id];
    editingCardId = id;

    // Populate form
    cardForm.contexto.value = card.contexto || '';
    cardForm.comportamentoAtual.value = card.comportamentoAtual || '';
    cardForm.comportamentoEsperado.value = card.comportamentoEsperado || '';
    cardForm.regrasNegocio.value = card.regrasNegocio || '';
    cardForm.responsavelTecnico.value = card.responsavelTecnico || '';
    cardForm.observacao.value = card.observacao || '';
    acceptanceCriteria = [...card.criteriosAceite];
    renderAcceptanceCriteria();

    createCardBtn.textContent = 'Salvar Edição';
    setFeedback('Card carregado para edicao.', 'info');
    cardForm.scrollIntoView({ behavior: 'smooth' });
  } else if (e.target.classList.contains('delete-card')) {
    if (confirm('Tem certeza que deseja excluir este card?')) {
      const id = parseInt(e.target.dataset.id);
      const cardToDelete = createdCards[id];
      sendToDiscord(cardToDelete, 'delete', id);
      createdCards.splice(id, 1);
      localStorage.setItem('createdCards', JSON.stringify(createdCards));
      renderCreatedCards();
      setFeedback('Card removido da fila local.', 'info');
    }
  }
});

// Initial render
renderCreatedCards();
