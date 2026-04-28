/**
 * mobile-patch.js — Req. Codex
 * DEVE ser carregado APÓS app.js (sem defer).
 * Detecta telas < 640 px, injeta bottom nav e gerencia
 * visibilidade de seções sem tocar no app.js.
 */
(function () {
  'use strict';

  var BP = 640;

  /* ── MAPA DE ABAS ─────────────────────────────────────────────
     Cada entrada mapeia um data-view para um array de IDs/seletores
     de elementos JÁ PRESENTES no HTML estático.              */
  var VIEW_SECTIONS = {
    sessao: [
      '.configuration-card',
      '.script-card'
    ],
    entrevista: [
      '.interview-card'
    ],
    requisitos: [
      '#requirements',
      '.surface-card:has(#quality-list)'
    ],
    artefatos: [
      '#artifacts'
    ]
  };

  var NAV_ITEMS = [
    { view: 'sessao',      icon: iconGrid(),     label: 'Sessão' },
    { view: 'entrevista',  icon: iconChat(),     label: 'Entrevista' },
    { view: 'requisitos',  icon: iconCheck(),    label: 'Requisitos', badge: true },
    { view: 'artefatos',   icon: iconFile(),     label: 'Artefatos' }
  ];

  /* ── ESTADO ──────────────────────────────────────────────── */
  var active      = 'sessao';
  var mobileOn    = false;
  var observer    = null;

  /* ── BOOT ────────────────────────────────────────────────── */
  function init() {
    check();
    window.addEventListener('resize', debounce(check, 120));
  }

  function check() {
    var now = window.innerWidth < BP;
    if (now && !mobileOn) { enable(); }
    else if (!now && mobileOn) { disable(); }
  }

  /* ── HABILITAR ───────────────────────────────────────────── */
  function enable() {
    mobileOn = true;
    injectNav();
    showView(active);
    startBadgeObserver();
  }

  /* ── DESABILITAR ─────────────────────────────────────────── */
  function disable() {
    mobileOn = false;

    var nav = document.getElementById('mobile-bnav');
    if (nav) nav.remove();

    /* restaura todas as seções */
    Object.keys(VIEW_SECTIONS).forEach(function (v) {
      getSections(v).forEach(show);
    });

    stopBadgeObserver();
  }

  /* ── NAVEGAÇÃO ───────────────────────────────────────────── */
  function injectNav() {
    if (document.getElementById('mobile-bnav')) return;

    var nav = document.createElement('nav');
    nav.id = 'mobile-bnav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Navegação principal');

    NAV_ITEMS.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'mbnav-btn' + (item.view === active ? ' is-active' : '');
      btn.dataset.view = item.view;
      btn.setAttribute('aria-label', item.label);
      btn.type = 'button';

      var iconWrap = document.createElement('span');
      iconWrap.className = 'mbnav-icon';
      iconWrap.setAttribute('aria-hidden', 'true');
      iconWrap.innerHTML = item.icon;

      if (item.badge) {
        var badge = document.createElement('span');
        badge.className = 'mbnav-badge';
        badge.id = 'mbnav-req-badge';
        badge.style.display = 'none';
        iconWrap.appendChild(badge);
      }

      var lbl = document.createElement('span');
      lbl.className = 'mbnav-label';
      lbl.textContent = item.label;

      btn.appendChild(iconWrap);
      btn.appendChild(lbl);

      btn.addEventListener('click', function () {
        showView(item.view);
      });

      nav.appendChild(btn);
    });

    document.body.appendChild(nav);
  }

  function showView(viewId) {
    active = viewId;

    /* esconde tudo, mostra o selecionado */
    Object.keys(VIEW_SECTIONS).forEach(function (v) {
      var els = getSections(v);
      if (v === viewId) { els.forEach(show); }
      else { els.forEach(hide); }
    });

    /* atualiza botões */
    var btns = document.querySelectorAll('.mbnav-btn');
    btns.forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.view === viewId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── HELPERS DOM ─────────────────────────────────────────── */
  function getSections(viewId) {
    var found = [];
    var selectors = VIEW_SECTIONS[viewId] || [];
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          found.push(el);
        });
      } catch (e) { /* seletor com :has pode falhar em browsers antigos */ }
    });
    return found;
  }

  function show(el) {
    el.style.removeProperty('display');
  }

  function hide(el) {
    el.style.display = 'none';
  }

  /* ── BADGE (MutationObserver no #requirement-count) ─────── */
  function startBadgeObserver() {
    stopBadgeObserver();
    var target = document.getElementById('requirement-count');
    if (!target) return;

    syncBadge(target);

    observer = new MutationObserver(function () {
      syncBadge(target);
    });
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  }

  function stopBadgeObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  function syncBadge(countEl) {
    var badge = document.getElementById('mbnav-req-badge');
    if (!badge) return;
    var n = parseInt(countEl.textContent, 10) || 0;
    badge.textContent = n;
    badge.style.display = n > 0 ? 'inline-flex' : 'none';
  }

  /* ── UTILITÁRIOS ─────────────────────────────────────────── */
  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  /* ── ÍCONES SVG ──────────────────────────────────────────── */
  function iconGrid() {
    return '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  }
  function iconChat() {
    return '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  }
  function iconCheck() {
    return '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
  }
  function iconFile() {
    return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
  }

  /* ── ARRANQUE ────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
