const loginForm = document.getElementById('login-form');
const bootstrapForm = document.getElementById('bootstrap-form');
const bootstrapBanner = document.getElementById('bootstrap-banner');
const loginFeedback = document.getElementById('login-feedback');
const bootstrapFeedback = document.getElementById('bootstrap-feedback');

boot();

async function boot() {
  const session = await fetch('/api/auth/session', { credentials: 'include' }).then((response) => response.json());
  if (session.authenticated) {
    window.location.href = '/elicitation';
    return;
  }

  const bootstrapRequired = Boolean(session.bootstrapRequired);
  bootstrapBanner.hidden = !bootstrapRequired;
  bootstrapForm.hidden = !bootstrapRequired;

  loginForm.addEventListener('submit', onLogin);
  bootstrapForm.addEventListener('submit', onBootstrap);
}

async function onLogin(event) {
  event.preventDefault();
  loginFeedback.textContent = '';
  loginFeedback.className = 'auth-feedback';
  const formData = new FormData(loginForm);
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.get('email'),
      password: formData.get('password'),
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    loginFeedback.textContent = payload.error || 'Falha no login';
    loginFeedback.classList.add('is-error');
    return;
  }
  window.location.href = '/elicitation';
}

async function onBootstrap(event) {
  event.preventDefault();
  bootstrapFeedback.textContent = '';
  bootstrapFeedback.className = 'auth-feedback';
  const formData = new FormData(bootstrapForm);
  const response = await fetch('/api/auth/bootstrap', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    bootstrapFeedback.textContent = payload.error || 'Falha ao criar admin';
    bootstrapFeedback.classList.add('is-error');
    return;
  }
  window.location.href = '/elicitation';
}
