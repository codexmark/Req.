(function () {
  async function getSession() {
    const response = await fetch('/api/auth/session', { credentials: 'include' });
    return response.json();
  }

  async function requireAuth(options = {}) {
    const data = await getSession();
    if (!data.authenticated) {
      window.location.href = '/';
      throw new Error('Unauthorized');
    }

    if (options.role && data.user.role !== options.role) {
      window.location.href = '/elicitation';
      throw new Error('Forbidden');
    }

    document.querySelectorAll('[data-admin-only]').forEach((element) => {
      element.hidden = data.user.role !== 'admin';
    });

    document.querySelectorAll('[data-logout]').forEach((button) => {
      button.addEventListener('click', async () => {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        window.location.href = '/';
      });
    });

    return data;
  }

  async function getUsers() {
    const response = await fetch('/api/users', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to load users');
    return response.json();
  }

  window.ReqAuth = {
    getSession,
    requireAuth,
    getUsers,
  };
})();
