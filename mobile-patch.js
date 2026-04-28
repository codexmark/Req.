/**
 * mobile-patch.js — Req. Codex
 * Detecta telas mobile, injeta bottom navigation e
 * gerencia troca de views sem alterar app.js.
 */

(function () {
  const MOBILE_BREAKPOINT = 640;

  /* ── BOTTOM NAV HTML ───────────────────────────── */
  const NAV_HTML = `
<nav class="mobile-bottom-nav" role="navigation" aria-label="Navegação principal">
  <button class="mobile-nav-item is-active" data-view="workspace" aria-label="Workspace">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
    Sessão
  </button>
  <button class="mobile-nav-item" data-view="requirements" aria-label="Requisitos">
    <span style="position:relative;display:inline-flex;">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      <span class="mobile-nav-badge" id="mobile-req-badge">0</span>
    </span>
    Requisitos
  </button>
  <button class="mobile-nav-item" data-view="artifacts" aria-label="Artefatos">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
    Artefatos
  </button>
  <button class="mobile-nav-item" data-view="config" aria-label="Configurações da sessão">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
    Config
  </button>
</nav>`;

  /* ── ESTADO ──────────────────────────────────────── */
  let isMobile = false;
  let activeView = 'workspace';

  /* ── INICIALIZAÇÃO ─────────────────────────────── */
  function init() {
    checkMobile();
    window.addEventListener('resize', debounce(checkMobile, 150));
  }

  function checkMobile() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < MOBILE_BREAKPOINT;

    if (isMobile && !wasMobile) {
      enableMobile();
    } else if (!isMobile && wasMobile) {
      disableMobile();
    }
  }

  /* ── HABILITAR MODO MOBILE ─────────────────────── */
  function enableMobile() {
    injectBottomNav();
    wrapViews();
    activateView(activeView);
    syncBadges();
    startBadgeSync();
  }

  /* ── DESABILITAR MODO MOBILE (volta ao desktop) ── */
  function disableMobile() {
    const nav = document.querySelector('.mobile-bottom-nav');
    if (nav) nav.remove();

    document.querySelectorAll('.mobile-view').forEach(wrapper => {
      while (wrapper.firstChild) {
        wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    });

    stopBadgeSync();
  }

  /* ── INJETA BOTTOM NAV ───────────────────────────── */
  function injectBottomNav() {
    if (document.querySelector('.mobile-bottom-nav')) return;
    document.body.insertAdjacentHTML('beforeend', NAV_HTML);

    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        activateView(btn.dataset.view);
      });
    });
  }

  /* ── ENVOLVE SEÇÕES EM VIEWS MOBILE ─────────────── */
  function wrapViews() {
    if (document.querySelector('.mobile-view')) return;

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    wrapSection('config', ['.configuration-card']);
    wrapSection('workspace', [
      '.script-card',
      '.workspace-grid .workspace-column:first-child',
    ]);
    wrapSection('requirements', [
      '#requirements',
      '.surface-card:has(#quality-list)',
    ]);
    wrapSection('artifacts', ['#artifacts']);

    const topbar = mainContent.querySelector('.topbar');
    if (topbar && !topbar.closest('.mobile-view')) {
      mainContent.insertBefore(topbar, mainContent.firstChild);
    }
  }

  function wrapSection(viewId, selectors) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const wrapper = document.createElement('section');
    wrapper.className = 'mobile-view';
    wrapper.dataset.view = viewId;

    const elements = [];
    selectors.forEach(sel => {
      mainContent.querySelectorAll(sel).forEach(el => {
        if (!el.closest('.mobile-view')) {
          elements.push(el);
        }
      });
    });

    if (!elements.length) return;

    elements[0].parentNode.insertBefore(wrapper, elements[0]);
    elements.forEach(el => wrapper.appendChild(el));
  }

  /* ── ATIVA UMA VIEW ─────────────────────────────── */
  function activateView(viewId) {
    activeView = viewId;

    document.querySelectorAll('.mobile-view').forEach(view => {
      view.classList.toggle('is-active', view.dataset.view === viewId);
    });

    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.view === viewId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── BADGE DE CONTAGEM DE REQUISITOS ────────────── */
  let badgeTimer = null;

  function syncBadges() {
    const badge = document.getElementById('mobile-req-badge');
    if (!badge) return;
    const count = document.getElementById('requirement-count');
    const value = count ? count.textContent.trim() : '0';
    badge.textContent = value;
    badge.style.display = (parseInt(value) > 0) ? 'inline-flex' : 'none';
  }

  function startBadgeSync() {
    stopBadgeSync();
    badgeTimer = setInterval(syncBadges, 1200);
  }

  function stopBadgeSync() {
    if (badgeTimer) {
      clearInterval(badgeTimer);
      badgeTimer = null;
    }
  }

  /* ── UTILITÁRIO ─────────────────────────────────── */
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  /* ── ARRANQUE ──────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
