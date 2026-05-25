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

    setupResponsiveNav();

    return data;
  }

  function setupResponsiveNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const drawer = document.querySelector('[data-nav-drawer]');
    if (!toggle || !drawer) return;

    const mobileQuery = window.matchMedia('(max-width: 980px)');

    const syncNav = () => {
      const isMobile = mobileQuery.matches;
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      drawer.hidden = isMobile ? !expanded : false;
      if (!isMobile) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    };

    toggle.addEventListener('click', () => {
      const nextExpanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(nextExpanded));
      syncNav();
    });

    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (!mobileQuery.matches) return;
        toggle.setAttribute('aria-expanded', 'false');
        syncNav();
      });
    });

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', syncNav);
    } else {
      mobileQuery.addListener(syncNav);
    }

    syncNav();
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
