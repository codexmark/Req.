(function () {
  async function parseResponse(response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: text || 'Unexpected response', code: 'INVALID_RESPONSE' };
    }
  }

  async function getSession() {
    const response = await fetch('/api/auth/session', { credentials: 'include' });
    const payload = await parseResponse(response);
    if (!response.ok) {
      return {
        authenticated: false,
        bootstrapRequired: false,
        infrastructureError: payload.error || 'Auth service unavailable',
      };
    }
    return payload;
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
    const payload = await parseResponse(response);
    if (!response.ok) throw new Error(payload.error || 'Failed to load users');
    return payload;
  }

  window.ReqAuth = {
    getSession,
    requireAuth,
    getUsers,
  };
})();
