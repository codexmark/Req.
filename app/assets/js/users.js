const userForm = document.getElementById('user-form');
const userFormTitle = document.getElementById('user-form-title');
const userFormReset = document.getElementById('user-form-reset');
const userFeedback = document.getElementById('user-feedback');
const usersList = document.getElementById('users-list');

let users = [];

boot();

async function boot() {
  await window.ReqAuth.requireAuth({ role: 'admin' });
  userForm.addEventListener('submit', onSubmit);
  userFormReset.addEventListener('click', resetForm);
  usersList.addEventListener('click', onListClick);
  await refreshUsers();
}

async function refreshUsers() {
  const payload = await window.ReqAuth.getUsers();
  users = payload.users || [];
  renderUsers();
}

function renderUsers() {
  if (!users.length) {
    usersList.innerHTML = '<div class="created-card created-card--empty"><h3>Nenhum usuário cadastrado</h3><p>Adicione a primeira pessoa para começar a distribuir ownership.</p></div>';
    return;
  }

  usersList.innerHTML = users.map((user) => `
    <div class="created-card">
      <div class="actions">
        <button class="button secondary" data-action="edit" data-id="${user.id}">Editar</button>
        <button class="button danger-light" data-action="delete" data-id="${user.id}">Excluir</button>
      </div>
      <h3>${escapeHtml(user.name)}</h3>
      <div class="card-section"><strong>Email:</strong> <p>${escapeHtml(user.email)}</p></div>
      <div class="card-section"><strong>Papel:</strong> <p>${escapeHtml(user.role)}</p></div>
      <div class="card-section"><strong>Status:</strong> <p>${user.active ? 'Ativo' : 'Inativo'}</p></div>
    </div>
  `).join('');
}

async function onSubmit(event) {
  event.preventDefault();
  setFeedback('');
  const formData = new FormData(userForm);
  const id = formData.get('id');
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    active: formData.get('active') === 'true',
  };

  const response = await fetch(id ? `/api/users/${id}` : '/api/users', {
    method: id ? 'PUT' : 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    setFeedback(data.error || 'Falha ao salvar usuário', 'error');
    return;
  }

  setFeedback('Usuario salvo com sucesso.', 'success');
  resetForm();
  await refreshUsers();
}

async function onListClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  const user = users.find((item) => item.id === id);
  if (!user) return;

  if (action === 'edit') {
    userForm.elements.id.value = user.id;
    userForm.elements.name.value = user.name;
    userForm.elements.email.value = user.email;
    userForm.elements.password.value = '';
    userForm.elements.role.value = user.role;
    userForm.elements.active.value = String(Boolean(user.active));
    userFormTitle.textContent = `Editar usuário: ${user.name}`;
    setFeedback('Usuário carregado para edição.', 'info');
    userForm.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (action === 'delete' && confirm(`Excluir ${user.name}?`)) {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const data = await response.json();
      setFeedback(data.error || 'Falha ao excluir usuário', 'error');
      return;
    }
    setFeedback('Usuario excluido.', 'info');
    await refreshUsers();
  }
}

function resetForm() {
  userForm.reset();
  userForm.elements.id.value = '';
  userForm.elements.active.value = 'true';
  userForm.elements.role.value = 'editor';
  userFormTitle.textContent = 'Adicionar usuário';
}

function setFeedback(message, kind = 'info') {
  userFeedback.textContent = message;
  userFeedback.className = `form-feedback full-span is-${kind}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
