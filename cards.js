// Card Creator Logic
const cardForm = document.getElementById('card-form');
const createCardBtn = document.getElementById('create-card');
const clearCardFormBtn = document.getElementById('clear-card-form');
const createdCardsList = document.getElementById('created-cards');
const addCriterionBtn = document.getElementById('add-criterion');
const newCriterionInput = document.getElementById('new-criterion');
const acceptanceCriteriaList = document.getElementById('acceptance-criteria-list');

let createdCards = JSON.parse(localStorage.getItem('createdCards') || '[]');
let editingCardId = null;
let acceptanceCriteria = [];

function sendToDiscord(card, action = 'create', cardIndex = null) {
  const webhookUrl = 'https://discordapp.com/api/webhooks/1500714126488502293/oEsgcW5jBJWw67lQN4paF5Z7hXKs4tBj45_ZbK3CBTgLDg17BWh8uON7bEhpVlLDxD7l';

  let title, color, description;

  switch (action) {
    case 'create':
      title = 'Novo Card Criado! 📋';
      color = 0x37b7a5; // Verde (accent)
      description = 'Um novo card foi adicionado ao sistema.';
      break;
    case 'update':
      title = 'Card Atualizado! ✏️';
      color = 0xf59e0b; // Amarelo (warning)
      description = `O card ${cardIndex + 1} foi editado.`;
      break;
    case 'delete':
      title = 'Card Excluído! 🗑️';
      color = 0xf9736b; // Vermelho (danger)
      description = `O card ${cardIndex + 1} foi removido do sistema.`;
      break;
    default:
      title = 'Card Modificado! 📝';
      color = 0x37b7a5;
      description = 'Uma ação foi realizada em um card.';
  }

  const message = {
    embeds: [{
      title: title,
      description: description,
      color: color,
      fields: action !== 'delete' ? [
        {
          name: 'Contexto',
          value: card.contexto || 'N/A',
          inline: false
        },
        {
          name: 'Comportamento Atual',
          value: card.comportamentoAtual || 'N/A',
          inline: false
        },
        {
          name: 'Comportamento Esperado',
          value: card.comportamentoEsperado || 'N/A',
          inline: false
        },
        {
          name: 'Regras de Negócio',
          value: card.regrasNegocio || 'N/A',
          inline: false
        },
        {
          name: 'Critérios de Aceite',
          value: card.criteriosAceite.length > 0 ? card.criteriosAceite.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'Nenhum',
          inline: false
        },
        {
          name: 'Observação',
          value: card.observacao || 'Nenhuma',
          inline: false
        }
      ] : [
        {
          name: 'Informações do Card Removido',
          value: 'O card foi permanentemente excluído do sistema.',
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Ação realizada em ${new Date().toLocaleString('pt-BR')}`
      }
    }]
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  }).catch(error => {
    console.error('Erro ao enviar para Discord:', error);
  });
}

function renderCreatedCards() {
  createdCardsList.innerHTML = '';
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
        <strong>Contexto:</strong> <p>${card.contexto || 'N/A'}</p>
      </div>
      <div class="card-section">
        <strong>Comportamento Atual:</strong> <p>${card.comportamentoAtual || 'N/A'}</p>
      </div>
      <div class="card-section">
        <strong>Comportamento Esperado:</strong> <p>${card.comportamentoEsperado || 'N/A'}</p>
      </div>
      <div class="card-section">
        <strong>Regras de Negócio:</strong> <p>${card.regrasNegocio || 'N/A'}</p>
      </div>
      <div class="card-section">
        <strong>Critérios de Aceite:</strong>
        <ul>${card.criteriosAceite.map(c => `<li>${c}</li>`).join('')}</ul>
      </div>
      ${card.observacao ? `<div class="card-section"><strong>Observação:</strong> <p>${card.observacao}</p></div>` : ''}
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
    criteriosAceite: [...acceptanceCriteria],
    observacao: formData.get('observacao')
  };

  // Basic validation: at least one field filled
  if (!card.contexto && !card.comportamentoAtual && !card.comportamentoEsperado && !card.regrasNegocio && card.criteriosAceite.length === 0) {
    alert('Preencha pelo menos um campo.');
    return;
  }

  if (editingCardId !== null) {
    createdCards[editingCardId] = card;
    sendToDiscord(card, 'update', editingCardId);
    editingCardId = null;
    createCardBtn.textContent = 'Criar Card';
  } else {
    createdCards.push(card);
    sendToDiscord(card, 'create', createdCards.length - 1);
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
    cardForm.observacao.value = card.observacao || '';
    acceptanceCriteria = [...card.criteriosAceite];
    renderAcceptanceCriteria();

    createCardBtn.textContent = 'Salvar Edição';
    cardForm.scrollIntoView({ behavior: 'smooth' });
  } else if (e.target.classList.contains('delete-card')) {
    if (confirm('Tem certeza que deseja excluir este card?')) {
      const id = parseInt(e.target.dataset.id);
      const cardToDelete = createdCards[id];
      sendToDiscord(cardToDelete, 'delete', id);
      createdCards.splice(id, 1);
      localStorage.setItem('createdCards', JSON.stringify(createdCards));
      renderCreatedCards();
    }
  }
});

// Initial render
renderCreatedCards();