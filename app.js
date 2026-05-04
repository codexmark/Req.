const STORAGE_KEY = "req-codex-elicitation-v2";

const initialState = {
  session: {
    projectName: "",
    client: "",
    facilitator: "",
    sessionDate: "",
    primaryGoal: "",
  },
  rawNotes: "",
  summaries: {
    objective: "",
    problem: "",
    actors: "",
    rules: "",
    behaviors: "",
    exceptions: "",
    questions: "",
  },
  requirements: [],
  selectedRequirementId: null,
  focusMode: false,
};

const state = loadState();

const els = {
  sessionForm: document.querySelector("#session-form"),
  rawNotes: document.querySelector("#raw-notes"),
  gapList: document.querySelector("#gap-list"),
  organizeButton: document.querySelector("#organize-button"),
  generateButton: document.querySelector("#generate-requirements"),
  addRequirementButton: document.querySelector("#add-requirement"),
  exportMarkdownButton: document.querySelector("#export-markdown"),
  exportJsonButton: document.querySelector("#export-json"),
  resetButton: document.querySelector("#reset-session"),
  focusToggle: document.querySelector("#focus-toggle"),
  autosaveIndicator: document.querySelector("#autosave-indicator"),
  sessionHealth: document.querySelector("#session-health"),
  captureMetric: document.querySelector("#capture-metric"),
  gapMetric: document.querySelector("#gap-metric"),
  draftMetric: document.querySelector("#draft-metric"),
  requirementCount: document.querySelector("#requirement-count"),
  requirementsList: document.querySelector("#requirements-list"),
  requirementForm: document.querySelector("#requirement-form"),
  editorTitle: document.querySelector("#editor-title"),
  requirementScore: document.querySelector("#requirement-score"),
  summaryFields: {
    objective: document.querySelector("#summary-objective"),
    problem: document.querySelector("#summary-problem"),
    actors: document.querySelector("#summary-actors"),
    rules: document.querySelector("#summary-rules"),
    behaviors: document.querySelector("#summary-behaviors"),
    exceptions: document.querySelector("#summary-exceptions"),
    questions: document.querySelector("#summary-questions"),
  },
};

boot();

function boot() {
  hydrateState();
  wireEvents();
  syncSessionForm();
  syncSummaryFields();

  if (!state.requirements.length && hasMeaningfulContext()) {
    organizeUnderstanding();
    generateRequirements(true);
  }

  render();
}

function wireEvents() {
  els.sessionForm.addEventListener("input", () => {
    state.session = Object.fromEntries(new FormData(els.sessionForm).entries());
    persist();
    renderMetrics();
    renderGaps();
  });

  els.rawNotes.addEventListener("input", () => {
    state.rawNotes = els.rawNotes.value;
    persist();
    renderMetrics();
    renderGaps();
  });

  Object.entries(els.summaryFields).forEach(([key, field]) => {
    field.addEventListener("input", () => {
      state.summaries[key] = field.value;
      persist();
      renderMetrics();
      renderGaps();
    });
  });

  document.querySelectorAll(".prompt-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.prompt;
      const prefix = state.rawNotes.trim() ? "\n\n" : "";
      state.rawNotes = `${state.rawNotes}${prefix}[Pergunta sugerida] ${prompt}\n`;
      els.rawNotes.value = state.rawNotes;
      els.rawNotes.focus();
      persist();
      renderMetrics();
      renderGaps();
    });
  });

  els.organizeButton.addEventListener("click", () => {
    organizeUnderstanding();
    persist();
    render();
  });

  els.generateButton.addEventListener("click", () => {
    generateRequirements(false);
    persist();
    render();
  });

  els.addRequirementButton.addEventListener("click", () => {
    const requirement = createEmptyRequirement();
    state.requirements.unshift(requirement);
    state.selectedRequirementId = requirement.id;
    persist();
    render();
  });

  els.requirementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const current = getSelectedRequirement();
    if (!current) return;

    Object.assign(current, formToRequirement());
    persist();
    render();
  });

  document.querySelector("#duplicate-requirement").addEventListener("click", () => {
    const current = getSelectedRequirement();
    if (!current) return;

    const clone = {
      ...current,
      id: nextRequirementId(),
      title: current.title ? `${current.title} (copia)` : "Novo requisito (copia)",
    };
    state.requirements.unshift(clone);
    state.selectedRequirementId = clone.id;
    persist();
    render();
  });

  document.querySelector("#delete-requirement").addEventListener("click", () => {
    const current = getSelectedRequirement();
    if (!current) return;

    state.requirements = state.requirements.filter((item) => item.id !== current.id);
    state.selectedRequirementId = state.requirements[0]?.id || null;
    persist();
    render();
  });

  els.exportMarkdownButton.addEventListener("click", () => {
    downloadFile("requisitos.md", buildMarkdownExport(), "text/markdown;charset=utf-8");
  });

  els.exportJsonButton.addEventListener("click", () => {
    downloadFile("requisitos.json", JSON.stringify(state, null, 2), "application/json;charset=utf-8");
  });

  els.resetButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, structuredClone(initialState));
    hydrateState();
    syncSessionForm();
    syncSummaryFields();
    els.rawNotes.value = "";
    persist();
    render();
  });

  els.focusToggle.addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    persist();
    render();
  });
}

function render() {
  document.body.classList.toggle("focus-mode", state.focusMode);
  els.focusToggle.textContent = state.focusMode ? "Modo padrao" : "Modo foco";
  els.rawNotes.value = state.rawNotes;

  renderMetrics();
  renderGaps();
  renderRequirements();
  renderRequirementEditor();
}

function renderMetrics() {
  const gaps = computeGaps();
  els.captureMetric.textContent = `${state.rawNotes.trim().length} chars`;
  els.gapMetric.textContent = String(gaps.length);
  els.draftMetric.textContent = String(state.requirements.length);
  els.requirementCount.textContent = `${state.requirements.length} itens`;
  els.sessionHealth.textContent = `${state.requirements.length} requisitos gerados`;
  els.autosaveIndicator.textContent = "Auto-save ativo";
}

function renderGaps() {
  const gaps = computeGaps();
  els.gapList.innerHTML = "";

  if (!gaps.length) {
    const li = document.createElement("li");
    li.textContent = "Sem lacunas criticas no momento. Ja da para gerar e revisar requisitos.";
    els.gapList.appendChild(li);
    return;
  }

  gaps.forEach((gap) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(gap.title)}</strong><span>${escapeHtml(gap.detail)}</span>`;
    els.gapList.appendChild(li);
  });
}

function renderRequirements() {
  els.requirementsList.innerHTML = "";

  if (!state.requirements.length) {
    const li = document.createElement("li");
    li.className = "requirements-list__empty";
    li.textContent = "Nenhum requisito ainda. Organize o entendimento e gere os rascunhos.";
    els.requirementsList.appendChild(li);
    return;
  }

  state.requirements.forEach((requirement) => {
    const li = document.createElement("li");
    li.className = `requirement-card ${requirement.id === state.selectedRequirementId ? "is-active" : ""}`;
    li.innerHTML = `
      <div class="requirement-card__top">
        <strong>${escapeHtml(requirement.title || requirement.id)}</strong>
        <span class="badge">${escapeHtml(requirement.priority)}</span>
      </div>
      <p>${escapeHtml(truncate(requirement.description || "Sem descricao", 140))}</p>
      <div class="requirement-card__meta">
        <span>${escapeHtml(requirement.id)}</span>
        <span>${escapeHtml(requirement.type)}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      state.selectedRequirementId = requirement.id;
      persist();
      renderRequirementEditor();
      renderRequirements();
    });
    els.requirementsList.appendChild(li);
  });
}

function renderRequirementEditor() {
  const current = getSelectedRequirement();
  const form = els.requirementForm.elements;

  if (!current) {
    els.editorTitle.textContent = "Selecione um requisito";
    els.requirementScore.textContent = "0/4 completo";
    form.id.value = "";
    form.title.value = "";
    form.description.value = "";
    form.type.value = "Funcional";
    form.priority.value = "Must";
    form.acceptanceCriteria.value = "";
    form.notes.value = "";
    return;
  }

  form.id.value = current.id;
  form.title.value = current.title;
  form.description.value = current.description;
  form.type.value = current.type;
  form.priority.value = current.priority;
  form.acceptanceCriteria.value = current.acceptanceCriteria;
  form.notes.value = current.notes;

  const score = scoreRequirement(current);
  els.editorTitle.textContent = current.title || current.id;
  els.requirementScore.textContent = `${score}/4 completo`;
}

function organizeUnderstanding() {
  const rawLines = splitLines(state.rawNotes);
  const heuristics = {
    objective: [
      /objetivo|meta|sucesso|resultado|precisa|quer/,
      state.session.primaryGoal ? new RegExp(escapeRegExp(state.session.primaryGoal), "i") : null,
    ],
    problem: [/problema|dor|impacto|hoje|atual|erro|retrabalho|lento|falha/],
    actors: [/usuario|usu[aá]rio|area|time|cliente|gestor|aprovador|rh|financeiro|operador|ator/],
    rules: [/regra|deve|obrigat|nunca|somente|permit|bloque|prazo|politica|restri/],
    behaviors: [/sistema|tela|listar|exibir|permitir|criar|editar|adicionar|calcular|gerar|abrir|enviar|validar/],
    exceptions: [/exce|risco|caso|falha|erro|quando|retroativ|pendencia|duvida/],
    questions: [/\?/, /nao sabemos|validar|confirmar|depende/],
  };

  for (const [key, patterns] of Object.entries(heuristics)) {
    const existing = state.summaries[key].trim();
    if (existing) continue;

    const selected = rawLines.filter((line) => patterns.some((pattern) => pattern && pattern.test(line)));
    state.summaries[key] = dedupeLines(selected).join("\n");
  }

  if (!state.summaries.objective.trim()) {
    state.summaries.objective = state.session.primaryGoal || firstSentence(state.rawNotes);
  }

  if (!state.summaries.problem.trim()) {
    state.summaries.problem = firstMeaningfulLine(rawLines);
  }

  if (!state.summaries.behaviors.trim()) {
    state.summaries.behaviors = rawLines.slice(0, 5).join("\n");
  }

  syncSummaryFields();
}

function generateRequirements(onlyWhenEmpty) {
  if (onlyWhenEmpty && state.requirements.length) return;

  const drafts = [];
  const seen = new Set(state.requirements.map((item) => normalizeKey(item.title)));
  const behaviorLines = dedupeLines(splitLines(state.summaries.behaviors));
  const ruleLines = dedupeLines(splitLines(state.summaries.rules));
  const exceptionLines = dedupeLines(splitLines(state.summaries.exceptions));

  behaviorLines.forEach((line) => {
    const requirement = buildRequirementFromLine(line, "Funcional");
    if (!requirement || seen.has(normalizeKey(requirement.title))) return;
    drafts.push(requirement);
    seen.add(normalizeKey(requirement.title));
  });

  ruleLines.forEach((line) => {
    const requirement = buildRequirementFromLine(line, "Regra");
    if (!requirement || seen.has(normalizeKey(requirement.title))) return;
    drafts.push(requirement);
    seen.add(normalizeKey(requirement.title));
  });

  if (exceptionLines.length) {
    const requirement = {
      ...createEmptyRequirement(),
      title: "Tratar excecoes e cenarios de risco",
      description: buildExceptionDescription(exceptionLines),
      type: "Regra",
      priority: "Should",
      acceptanceCriteria: exceptionLines.map((line) => `- [ ] ${line}`).join("\n"),
      notes: state.summaries.questions.trim(),
    };
    if (!seen.has(normalizeKey(requirement.title))) {
      drafts.push(requirement);
      seen.add(normalizeKey(requirement.title));
    }
  }

  if (!drafts.length && hasMeaningfulContext()) {
    drafts.push(buildFallbackRequirement());
  }

  state.requirements = mergeRequirements(state.requirements, drafts);
  state.selectedRequirementId = state.requirements[0]?.id || null;
}

function buildRequirementFromLine(line, type) {
  const cleanLine = normalizeSentence(line);
  if (!cleanLine) return null;

  return {
    ...createEmptyRequirement(),
    title: buildTitleFromLine(cleanLine, type),
    description: buildDescriptionFromLine(cleanLine, type),
    type,
    priority: type === "Regra" ? "Must" : "Should",
    acceptanceCriteria: buildAcceptanceForLine(cleanLine),
    notes: buildRequirementNotes(),
  };
}

function buildFallbackRequirement() {
  const objective = state.summaries.objective || state.session.primaryGoal || "atender o objetivo da sessao";
  const problem = state.summaries.problem || "resolver o problema relatado";

  return {
    ...createEmptyRequirement(),
    title: "Consolidar fluxo principal da necessidade",
    description: `O sistema deve ${lowercaseFirst(objective)} sem perder o foco em ${lowercaseFirst(problem)}.`,
    type: "Funcional",
    priority: "Must",
    acceptanceCriteria: "- [ ] O fluxo principal fica claro para negocio e tecnologia\n- [ ] O requisito pode ser validado com o stakeholder",
    notes: buildRequirementNotes(),
  };
}

function buildExceptionDescription(lines) {
  return `O sistema deve tratar cenarios de excecao e risco observados durante a elicitação, incluindo: ${lines
    .map((line) => lowercaseFirst(line))
    .join("; ")}.`;
}

function buildRequirementNotes() {
  return [state.summaries.questions, state.summaries.actors].filter(Boolean).join("\n\n").trim();
}

function buildTitleFromLine(line, type) {
  const action = line.replace(/^[-*]\s*/, "").replace(/\.$/, "");
  const words = action.split(/\s+/).slice(0, 8).join(" ");
  return type === "Regra" ? `Aplicar regra: ${words}` : capitalize(words);
}

function buildDescriptionFromLine(line, type) {
  const prefix = type === "Regra" ? "O sistema deve obedecer a regra de negocio:" : "O sistema deve";
  const prepared = line.match(/^o sistema/i) ? line : `${prefix} ${lowercaseFirst(line)}`;
  return ensurePeriod(prepared);
}

function buildAcceptanceForLine(line) {
  return [
    `- [ ] ${ensurePeriod(capitalize(line))}`,
    "- [ ] O comportamento esperado pode ser verificado pelo stakeholder",
  ].join("\n");
}

function renderRequirementSelectionFallback() {
  state.selectedRequirementId = state.requirements[0]?.id || null;
}

function formToRequirement() {
  const form = new FormData(els.requirementForm);
  return {
    id: form.get("id"),
    title: String(form.get("title") || "").trim(),
    description: String(form.get("description") || "").trim(),
    type: String(form.get("type") || "Funcional"),
    priority: String(form.get("priority") || "Must"),
    acceptanceCriteria: String(form.get("acceptanceCriteria") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
  };
}

function createEmptyRequirement() {
  return {
    id: nextRequirementId(),
    title: "",
    description: "",
    type: "Funcional",
    priority: "Must",
    acceptanceCriteria: "",
    notes: "",
  };
}

function getSelectedRequirement() {
  const current = state.requirements.find((item) => item.id === state.selectedRequirementId);
  if (current) return current;
  renderRequirementSelectionFallback();
  return state.requirements.find((item) => item.id === state.selectedRequirementId) || null;
}

function scoreRequirement(requirement) {
  if (!requirement) return 0;
  const checks = [
    requirement.title.trim(),
    requirement.description.trim(),
    requirement.acceptanceCriteria.trim(),
    requirement.type.trim(),
  ];
  return checks.filter(Boolean).length;
}

function computeGaps() {
  const gaps = [];

  if (!state.rawNotes.trim()) {
    gaps.push({
      title: "Falta captura de conversa",
      detail: "Sem registro bruto, a geracao de requisitos fica pobre e tendenciosa.",
    });
  }

  if (!state.session.primaryGoal.trim()) {
    gaps.push({
      title: "Objetivo da sessao nao informado",
      detail: "Defina o resultado que precisa sair da reuniao para orientar o corte dos requisitos.",
    });
  }

  if (!state.summaries.problem.trim() && state.rawNotes.trim().length > 40) {
    gaps.push({
      title: "Problema atual nao consolidado",
      detail: "Resuma a dor principal para evitar requisitos sem contexto de negocio.",
    });
  }

  if (!state.summaries.behaviors.trim() && state.rawNotes.trim().length > 40) {
    gaps.push({
      title: "Comportamentos esperados ausentes",
      detail: "Liste o que o sistema precisa permitir, calcular, exibir ou bloquear.",
    });
  }

  if (state.requirements.some((item) => scoreRequirement(item) < 3)) {
    gaps.push({
      title: "Existem requisitos superficiais",
      detail: "Alguns rascunhos ainda precisam de descricao ou criterio de aceite melhor.",
    });
  }

  return gaps;
}

function buildMarkdownExport() {
  const project = state.session.projectName || "Sessao sem nome";
  const lines = [
    `# ${project}`,
    "",
    "## Contexto da sessao",
    "",
    `- Area / cliente: ${state.session.client || "Nao informado"}`,
    `- Facilitador: ${state.session.facilitator || "Nao informado"}`,
    `- Data: ${state.session.sessionDate || "Nao informada"}`,
    `- Objetivo: ${state.session.primaryGoal || "Nao informado"}`,
    "",
    "## Entendimento consolidado",
    "",
    `### Objetivo de negocio\n${state.summaries.objective || "Nao preenchido"}`,
    "",
    `### Problema atual\n${state.summaries.problem || "Nao preenchido"}`,
    "",
    `### Atores e areas\n${state.summaries.actors || "Nao preenchido"}`,
    "",
    `### Regras e restricoes\n${state.summaries.rules || "Nao preenchido"}`,
    "",
    `### Comportamentos esperados\n${state.summaries.behaviors || "Nao preenchido"}`,
    "",
    `### Excecoes e riscos\n${state.summaries.exceptions || "Nao preenchido"}`,
    "",
    `### Perguntas em aberto\n${state.summaries.questions || "Sem pendencias registradas"}`,
    "",
    "## Requisitos",
    "",
  ];

  state.requirements.forEach((requirement) => {
    lines.push(`### ${requirement.id} - ${requirement.title || "Sem titulo"}`);
    lines.push("");
    lines.push(`- Tipo: ${requirement.type}`);
    lines.push(`- Prioridade: ${requirement.priority}`);
    lines.push("");
    lines.push(requirement.description || "Sem descricao");
    lines.push("");
    lines.push("#### Criterios de aceite");
    lines.push(requirement.acceptanceCriteria || "Sem criterios");
    lines.push("");
    lines.push("#### Observacoes");
    lines.push(requirement.notes || "Sem observacoes");
    lines.push("");
  });

  return lines.join("\n");
}

function mergeRequirements(existing, incoming) {
  const merged = [...existing];
  incoming.forEach((item) => {
    if (!item.title && !item.description) return;
    const exists = merged.some((current) => normalizeKey(current.title) === normalizeKey(item.title));
    if (!exists) merged.unshift(item);
  });
  return merged;
}

function syncSessionForm() {
  Object.entries(state.session).forEach(([key, value]) => {
    if (els.sessionForm.elements[key]) {
      els.sessionForm.elements[key].value = value;
    }
  });
}

function syncSummaryFields() {
  Object.entries(els.summaryFields).forEach(([key, field]) => {
    field.value = state.summaries[key] || "";
  });
}

function hydrateState() {
  if (!state.session) state.session = structuredClone(initialState.session);
  state.session = { ...initialState.session, ...state.session };
  state.summaries = { ...initialState.summaries, ...state.summaries };
  state.requirements = Array.isArray(state.requirements) ? state.requirements : [];
  state.selectedRequirementId = state.selectedRequirementId || state.requirements[0]?.id || null;
  state.rawNotes = state.rawNotes || "";
  state.focusMode = Boolean(state.focusMode);
}

function hasMeaningfulContext() {
  return Boolean(
    state.rawNotes.trim() ||
      state.session.primaryGoal.trim() ||
      Object.values(state.summaries).some((value) => value.trim())
  );
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...structuredClone(initialState), ...JSON.parse(raw) } : structuredClone(initialState);
  } catch (error) {
    console.error("Falha ao carregar estado:", error);
    return structuredClone(initialState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextRequirementId() {
  const next =
    state.requirements.reduce((max, item) => {
      const match = String(item.id || "").match(/REQ-(\d+)/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0) + 1;
  return `REQ-${String(next).padStart(3, "0")}`;
}

function splitLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function dedupeLines(lines) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}

function firstMeaningfulLine(lines) {
  return lines.find((line) => line.length > 16) || "";
}

function firstSentence(text) {
  return text.split(/[.!?]/).map((item) => item.trim()).find(Boolean) || "";
}

function normalizeSentence(text) {
  return text.replace(/\s+/g, " ").trim();
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowercaseFirst(text) {
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function ensurePeriod(text) {
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

function normalizeKey(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
