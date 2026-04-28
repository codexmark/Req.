const STORAGE_KEY = "requisitador-pro-state-v1";

const categories = [
  "Negócio",
  "Stakeholder",
  "Funcional",
  "NFR",
  "Regra",
  "Restrição",
  "Integração",
  "Relatório",
  "Dado",
  "Exceção",
];

const blocks = [
  {
    id: "contexto",
    title: "Contexto do negócio",
    purpose: "Entender o problema real, a motivação da demanda e o impacto de não agir.",
    category: "Negócio",
    questions: [
      "Que problema motivou esta demanda?",
      "O que acontece hoje se nada for feito?",
      "Quem é mais impactado por essa dor no dia a dia?",
    ],
  },
  {
    id: "objetivos",
    title: "Objetivos e sucesso",
    purpose: "Tornar o resultado mensurável para evitar requisitos sem critério de valor.",
    category: "NFR",
    questions: [
      "Como você saberá que a solução teve sucesso?",
      "Quais indicadores, metas ou SLAs devem melhorar?",
      "O que seria um resultado aceitável no primeiro corte?",
    ],
  },
  {
    id: "stakeholders",
    title: "Stakeholders",
    purpose: "Mapear atores, aprovações, conflitos e pontos de veto.",
    category: "Stakeholder",
    questions: [
      "Quem usa, aprova, mantém, audita ou pode vetar a solução?",
      "Quais áreas têm interesses diferentes nesse processo?",
      "Quem decide prioridade e aceita a entrega final?",
    ],
  },
  {
    id: "processo",
    title: "Processo atual",
    purpose: "Levantar o fluxo AS-IS com passos, gatilhos, entradas, saídas e sistemas envolvidos.",
    category: "Funcional",
    questions: [
      "Descreva o fluxo atual do início ao fim.",
      "O que dispara o processo e quais dados entram?",
      "Quais sistemas, pessoas e documentos participam?",
    ],
  },
  {
    id: "dores",
    title: "Dor e falhas",
    purpose: "Identificar gargalos, retrabalho, erro operacional e dependência manual.",
    category: "Funcional",
    questions: [
      "Em quais pontos o processo falha, atrasa ou exige interpretação humana?",
      "Quais retrabalhos ou controles paralelos existem hoje?",
      "Que erro é mais caro ou frequente nesse fluxo?",
    ],
  },
  {
    id: "regras",
    title: "Regras e exceções",
    purpose: "Capturar lógica de decisão, proibições, exceções e cenários raros.",
    category: "Regra",
    questions: [
      "Quais regras de negócio precisam ser obedecidas?",
      "O que nunca pode acontecer?",
      "Quais exceções existem e como devem ser tratadas?",
    ],
  },
  {
    id: "funcionais",
    title: "Requisitos funcionais",
    purpose: "Descobrir capacidades, ações, entradas, saídas, alertas e relatórios necessários.",
    category: "Funcional",
    questions: [
      "Quais tarefas o sistema deve permitir ou automatizar?",
      "Quais entradas, saídas, alertas e relatórios são necessários?",
      "Quais decisões devem ser assistidas pelo sistema?",
    ],
  },
  {
    id: "nfr",
    title: "Qualidade e operação",
    purpose: "Cobrir desempenho, segurança, auditoria, disponibilidade, usabilidade e conformidade.",
    category: "NFR",
    questions: [
      "Qual desempenho mínimo é aceitável?",
      "Quais exigências de segurança, auditoria e rastreabilidade existem?",
      "Há requisitos de disponibilidade, acessibilidade ou retenção?",
    ],
  },
  {
    id: "restricoes",
    title: "Restrições e dependências",
    purpose: "Evitar soluções inviáveis por prazo, orçamento, norma, integração ou infraestrutura.",
    category: "Restrição",
    questions: [
      "Quais limitações de prazo, orçamento ou tecnologia existem?",
      "De quais sistemas, dados ou times esta solução depende?",
      "Há normas, políticas ou integrações obrigatórias?",
    ],
  },
  {
    id: "priorizacao",
    title: "Priorização e validação",
    purpose: "Fechar com corte de MVP, ordem de entrega e método de verificação.",
    category: "Negócio",
    questions: [
      "O que é obrigatório no MVP?",
      "Como este requisito será verificado?",
      "O que pode ficar para uma etapa posterior sem comprometer valor?",
    ],
  },
];

const initialState = {
  project: {
    projectName: "",
    client: "",
    domain: "",
    primaryGoal: "",
    facilitator: "",
    sessionDate: "",
    meetingType: "",
    businessProblem: "",
    successMetric: "",
  },
  currentBlock: 0,
  currentQuestion: 0,
  blockQuestionIndex: {},
  answers: [],
  requirements: [],
  selectedRequirementId: null,
  activeArtifactTab: "backlog",
  meetingMode: false,
};

const state = loadState();

const els = {
  blockNav: document.querySelector("#block-nav"),
  currentBlockPill: document.querySelector("#current-block-pill"),
  sessionProgress: document.querySelector("#session-progress"),
  requirementCount: document.querySelector("#requirement-count"),
  gapCount: document.querySelector("#gap-count"),
  interviewTitle: document.querySelector("#interview-title"),
  interviewPurpose: document.querySelector("#interview-purpose"),
  currentQuestion: document.querySelector("#current-question"),
  currentQuestionProgress: document.querySelector("#current-question-progress"),
  adaptiveQuestions: document.querySelector("#adaptive-questions"),
  answerInput: document.querySelector("#answer-input"),
  answerList: document.querySelector("#answer-list"),
  answerCount: document.querySelector("#answer-count"),
  gapList: document.querySelector("#gap-list"),
  requirementList: document.querySelector("#requirement-list"),
  requirementForm: document.querySelector("#requirement-form"),
  qualityList: document.querySelector("#quality-list"),
  qualityScore: document.querySelector("#quality-score"),
  projectForm: document.querySelector("#project-form"),
  backlogSummary: document.querySelector("#backlog-summary"),
  backlogList: document.querySelector("#backlog-list"),
  traceabilityBody: document.querySelector("#traceability-body"),
  minutesPreview: document.querySelector("#minutes-preview"),
  progressToast: document.querySelector("#progress-toast"),
  progressToastMessage: document.querySelector("#progress-toast__message"),
};

boot();

function boot() {
  hydrateState();
  fillCategoryOptions();
  wireEvents();
  syncProjectForm();

  if (!state.requirements.length) {
    const seeded = buildRequirementFromAnswer(
      "O app deve conduzir sessões de elicitação guiada e transformar respostas em requisitos atômicos com rastreabilidade.",
      "Funcional"
    );
    seeded.title = "Conduzir sessão guiada de elicitação";
    seeded.source = "Chat base importado";
    seeded.stakeholder = "Analista de requisitos";
    seeded.rationale = "Permitir sessões padronizadas com captura estruturada.";
    seeded.acceptanceCriteria =
      "O usuário consegue percorrer blocos, salvar respostas e gerar requisitos a partir da entrevista.";
    seeded.fitCriterion = "Todas as 10 etapas da sessão ficam acessíveis sem perda de dados.";
    state.requirements.push(seeded);
    state.selectedRequirementId = seeded.id;
  }

  render();
  persist();
}

function wireEvents() {
  document.querySelector("#next-question").addEventListener("click", () => {
    moveToNextQuestion();
    persist();
  });

  document.querySelector("#next-block").addEventListener("click", () => {
    moveToNextBlock();
    render();
    persist();
  });

  document.querySelector("#save-answer").addEventListener("click", () => {
    const text = els.answerInput.value.trim();
    if (!text) return;

    const block = blocks[state.currentBlock];
    state.answers.unshift({
      id: crypto.randomUUID(),
      blockId: block.id,
      blockTitle: block.title,
      question: block.questions[getQuestionIndexForBlock(block.id)],
      text,
      createdAt: new Date().toISOString(),
    });
    els.answerInput.value = "";
    advanceAfterAnswer(block.id);
    render();
    persist();
  });

  document.querySelector("#derive-requirement").addEventListener("click", () => {
    const text = els.answerInput.value.trim();
    if (!text) return;

    const block = blocks[state.currentBlock];
    const requirement = buildRequirementFromAnswer(text, block.category);
    requirement.source = `Bloco: ${block.title}`;
    requirement.stakeholder = state.project.client || "Stakeholder não informado";
    requirement.rationale = state.project.businessProblem || "Racional ainda não registrado.";
    state.requirements.unshift(requirement);
    state.selectedRequirementId = requirement.id;
    render();
    persist();
  });

  document.querySelector("#new-requirement").addEventListener("click", () => {
    const requirement = emptyRequirement();
    state.requirements.unshift(requirement);
    state.selectedRequirementId = requirement.id;
    render();
    persist();
  });

  document.querySelector("#save-requirement").addEventListener("click", (event) => {
    event.preventDefault();
    const current = getSelectedRequirement();
    if (!current) return;
    Object.assign(current, formToRequirement());
    render();
    persist();
  });

  document.querySelector("#clone-requirement").addEventListener("click", (event) => {
    event.preventDefault();
    const current = getSelectedRequirement();
    if (!current) return;
    const clone = { ...current, id: nextRequirementId(), title: `${current.title} (cópia)` };
    state.requirements.unshift(clone);
    state.selectedRequirementId = clone.id;
    render();
    persist();
  });

  document.querySelector("#delete-requirement").addEventListener("click", (event) => {
    event.preventDefault();
    const current = getSelectedRequirement();
    if (!current) return;
    state.requirements = state.requirements.filter((item) => item.id !== current.id);
    state.selectedRequirementId = state.requirements[0]?.id || null;
    render();
    persist();
  });

  document.querySelector("#export-markdown").addEventListener("click", () => {
    downloadFile("requisitos.md", exportMarkdown(), "text/markdown;charset=utf-8");
  });

  document.querySelector("#export-json").addEventListener("click", () => {
    downloadFile(
      "requisitos.json",
      JSON.stringify(state, null, 2),
      "application/json;charset=utf-8"
    );
  });

  document.querySelector("#export-backlog").addEventListener("click", () => {
    downloadFile("backlog-inicial.md", exportBacklogMarkdown(), "text/markdown;charset=utf-8");
  });

  document.querySelector("#export-traceability").addEventListener("click", () => {
    downloadFile(
      "matriz-rastreabilidade.md",
      exportTraceabilityMarkdown(),
      "text/markdown;charset=utf-8"
    );
  });

  document.querySelector("#export-minutes").addEventListener("click", () => {
    downloadFile("ata-da-sessao.md", exportMinutesMarkdown(), "text/markdown;charset=utf-8");
  });

  document.querySelector("#reset-session").addEventListener("click", () => {
    resetSession();
  });

  const resetTopButton = document.querySelector("#reset-session-top");
  if (resetTopButton) {
    resetTopButton.addEventListener("click", () => {
      resetSession();
    });
  }

  els.projectForm.addEventListener("input", () => {
    state.project = Object.fromEntries(new FormData(els.projectForm).entries());
    persist();
    render();
  });

  document.querySelector("#meeting-mode-toggle").addEventListener("click", () => {
    state.meetingMode = !state.meetingMode;
    render();
    persist();
  });

  document.querySelectorAll("[data-artifact-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeArtifactTab = button.dataset.artifactTab;
      renderArtifacts();
      persist();
    });
  });
}

function render() {
  document.body.classList.toggle("meeting-mode", state.meetingMode);
  const meetingButton = document.querySelector("#meeting-mode-toggle");
  if (meetingButton) {
    meetingButton.textContent = state.meetingMode ? "Modo padrão" : "Modo foco";
  }
  document.title = "Req. Codex";
  renderBlocks();
  renderMetrics();
  renderInterview();
  renderAnswers();
  renderRequirements();
  renderRequirementForm();
  renderQuality();
  renderArtifacts();
  applyEnglishLabels();
}

function renderBlocks() {
  els.blockNav.innerHTML = "";
  blocks.forEach((block, index) => {
    const answeredCount = getAnsweredQuestionIndexes(block.id).length;
    const button = document.createElement("button");
    button.className = `block-button ${index === state.currentBlock ? "is-active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="block-button__title">${index + 1}. ${block.title}</span>
      <span class="block-button__meta">${answeredCount}/${block.questions.length} respondidas</span>
    `;
    button.addEventListener("click", () => {
      state.currentBlock = index;
      state.blockQuestionIndex[block.id] = resolveQuestionIndex(block.id);
      render();
      showProgressToast(`Bloco ${index + 1}/${blocks.length}: ${block.title}`);
      persist();
    });
    els.blockNav.appendChild(button);
  });
}

function renderMetrics() {
  const completedBlockIds = new Set(state.answers.map((item) => item.blockId));
  const gaps = computeSessionGaps();
  els.sessionProgress.textContent = `${completedBlockIds.size}/${blocks.length}`;
  els.requirementCount.textContent = String(state.requirements.length);
  els.gapCount.textContent = String(gaps.length);
}

function renderInterview() {
  const block = blocks[state.currentBlock];
  const questionIndex = getQuestionIndexForBlock(block.id);
  els.interviewTitle.textContent = block.title;
  els.interviewPurpose.textContent = block.purpose;
  els.currentQuestion.textContent = block.questions[questionIndex];
  els.currentQuestionProgress.textContent = `Pergunta ${questionIndex + 1}/${block.questions.length}`;
  els.currentBlockPill.textContent = block.title;
  els.adaptiveQuestions.innerHTML = "";

  buildAdaptiveQuestions(block).forEach((question) => {
    const li = document.createElement("li");
    li.textContent = question;
    els.adaptiveQuestions.appendChild(li);
  });
}

function renderAnswers() {
  const block = blocks[state.currentBlock];
  const answers = state.answers.filter((item) => item.blockId === block.id);
  els.answerCount.textContent = `${answers.length} respostas`;
  els.answerList.innerHTML = "";
  els.gapList.innerHTML = "";

  if (!answers.length) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhuma resposta registrada neste bloco ainda.";
    els.answerList.appendChild(empty);
  }

  answers.forEach((answer) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${answer.question}</strong>
      <div>${escapeHtml(answer.text)}</div>
      <div class="answer-meta">
        <span class="meta-chip">${formatDate(answer.createdAt)}</span>
        <span class="meta-chip">${answer.blockTitle}</span>
      </div>
    `;
    els.answerList.appendChild(li);
  });

  const gaps = computeSessionGaps().filter((gap) => gap.blockId === block.id);
  if (!gaps.length) {
    const li = document.createElement("li");
    li.textContent = "Sem lacunas críticas detectadas neste bloco.";
    els.gapList.appendChild(li);
  } else {
    gaps.forEach((gap) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${gap.title}</strong><div>${gap.detail}</div>`;
      els.gapList.appendChild(li);
    });
  }
}

function renderRequirements() {
  els.requirementList.innerHTML = "";
  if (!state.requirements.length) {
    const li = document.createElement("li");
    li.className = "requirement-item";
    li.textContent = "Nenhum requisito criado.";
    els.requirementList.appendChild(li);
    return;
  }

  state.requirements.forEach((requirement) => {
    const li = document.createElement("li");
    li.className = `requirement-item ${
      requirement.id === state.selectedRequirementId ? "is-selected" : ""
    }`;
    li.innerHTML = `
      <strong>${escapeHtml(requirement.title || requirement.id)}</strong>
      <div>${escapeHtml(truncate(requirement.description, 120))}</div>
      <div class="requirement-meta">
        <span class="meta-chip">${requirement.id}</span>
        <span class="meta-chip">${requirement.category}</span>
        <span class="meta-chip">${requirement.priority}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      state.selectedRequirementId = requirement.id;
      renderRequirementForm();
      renderRequirements();
      renderQuality();
      persist();
    });
    els.requirementList.appendChild(li);
  });
}

function renderRequirementForm() {
  const current = getSelectedRequirement() || emptyRequirement();
  const form = els.requirementForm.elements;
  form.id.value = current.id;
  form.title.value = current.title;
  form.description.value = current.description;
  form.category.value = current.category;
  form.priority.value = current.priority;
  form.stakeholder.value = current.stakeholder;
  form.source.value = current.source;
  form.rationale.value = current.rationale;
  form.acceptanceCriteria.value = current.acceptanceCriteria;
  form.fitCriterion.value = current.fitCriterion;
  form.verificationMethod.value = current.verificationMethod;
  form.dependencies.value = current.dependencies;
  form.risks.value = current.risks;
  form.impacts.value = current.impacts;
  form.notes.value = current.notes;
}

function renderQuality() {
  const current = getSelectedRequirement();
  const checks = assessRequirement(current);
  const passed = checks.filter((item) => item.ok).length;
  els.qualityScore.textContent = `${passed}/${checks.length}`;
  els.qualityScore.className = `pill ${
    passed >= 4 ? "success" : passed >= 2 ? "warning" : "subtle"
  }`;
  els.qualityList.innerHTML = "";

  checks.forEach((check) => {
    const li = document.createElement("li");
    li.className = check.ok ? "good" : "bad";
    li.innerHTML = `<strong>${check.label}</strong><div>${check.message}</div>`;
    els.qualityList.appendChild(li);
  });
}

function renderArtifacts() {
  const backlog = buildBacklogItems();
  const traceability = buildTraceabilityRows();
  const minutes = buildMinutesModel();

  document.querySelectorAll("[data-artifact-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.artifactTab === state.activeArtifactTab);
  });

  document.querySelectorAll(".artifact-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `artifact-${state.activeArtifactTab}`);
  });

  els.backlogSummary.innerHTML = `
    <strong>Resumo do backlog inicial</strong>
    <div>${backlog.length} item(ns) priorizados a partir dos requisitos capturados.</div>
  `;

  els.backlogList.innerHTML = "";
  backlog.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${escapeHtml(item.title)}</strong>
      <div>${escapeHtml(item.summary)}</div>
      <div class="artifact-meta">
        <span class="meta-chip">${item.priority}</span>
        <span class="meta-chip">${item.type}</span>
        <span class="meta-chip">${item.verification}</span>
      </div>
    `;
    els.backlogList.appendChild(li);
  });

  if (!backlog.length) {
    const li = document.createElement("li");
    li.textContent = "Crie requisitos para gerar o backlog inicial.";
    els.backlogList.appendChild(li);
  }

  els.traceabilityBody.innerHTML = "";
  traceability.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.source)}</td>
      <td>${escapeHtml(row.objective)}</td>
      <td>${escapeHtml(row.verification)}</td>
    `;
    els.traceabilityBody.appendChild(tr);
  });

  if (!traceability.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">Nenhum requisito disponível para rastreabilidade.</td>`;
    els.traceabilityBody.appendChild(tr);
  }

  els.minutesPreview.innerHTML = `
    <div class="minutes-section">
      <strong>Contexto da sessão</strong>
      <p><b>Projeto:</b> ${escapeHtml(minutes.projectName)}</p>
      <p><b>Cliente / área:</b> ${escapeHtml(minutes.client)}</p>
      <p><b>Facilitador:</b> ${escapeHtml(minutes.facilitator)}</p>
      <p><b>Data:</b> ${escapeHtml(minutes.sessionDate)}</p>
      <p><b>Tipo:</b> ${escapeHtml(minutes.meetingType)}</p>
    </div>
    <div class="minutes-section">
      <strong>Objetivo da reunião</strong>
      <p>${escapeHtml(minutes.objective)}</p>
    </div>
    <div class="minutes-section">
      <strong>Principais pontos levantados</strong>
      <ul>${minutes.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
    <div class="minutes-section">
      <strong>Decisões e encaminhamentos</strong>
      <ul>${minutes.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
    <div class="minutes-section">
      <strong>Pendências</strong>
      <ul>${minutes.pending.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function buildAdaptiveQuestions(block) {
  const text = `${state.project.businessProblem} ${state.project.successMetric} ${els.answerInput.value}`.toLowerCase();
  const adaptive = [...defaultAdaptiveQuestionsForBlock(block)];

  if (/integra|api|sistema|origem|planilha/.test(text)) {
    adaptive.push(
      "Qual sistema origem, formato, frequência, falhas esperadas e regra de reconciliação existem nesta integração?"
    );
  }

  if (/prazo|tempo|sla|minuto|hora|dia/.test(text)) {
    adaptive.push("Qual é o tempo máximo aceitável, em que cenário e como isso será medido?");
  }

  if (/sigilo|segurança|perfil|acesso|auditoria/.test(text)) {
    adaptive.push(
      "Quem pode ver, alterar, aprovar e auditar este dado ou decisão? O que precisa ficar rastreado?"
    );
  }

  if (/regra|aprov|valida|deve|nunca/.test(text) || block.id === "regras") {
    adaptive.push("Qual exceção existe para essa regra e como ela deve ser tratada sem quebrar o processo?");
  }

  if (/relat|painel|indicador|kpi/.test(text)) {
    adaptive.push("Quem consome essa saída, com que frequência e qual decisão depende dela?");
  }

  return [...new Set(adaptive)].slice(0, 3);
}

function computeSessionGaps() {
  const gaps = [];
  const answeredBlocks = new Set(state.answers.map((item) => item.blockId));

  blocks.forEach((block) => {
    if (!answeredBlocks.has(block.id)) {
      gaps.push({
        blockId: block.id,
        title: `Bloco sem cobertura: ${block.title}`,
        detail: "Ainda não há respostas registradas para este bloco da entrevista.",
      });
    }
  });

  if (!state.project.successMetric.trim()) {
    gaps.push({
      blockId: "objetivos",
      title: "Critério de sucesso ausente",
      detail: "Defina KPI, SLA ou evidência objetiva para medir valor da solução.",
    });
  }

  if (!state.project.businessProblem.trim()) {
    gaps.push({
      blockId: "contexto",
      title: "Problema de negócio ausente",
      detail: "Registre a dor principal e o impacto de não agir.",
    });
  }

  const requirementsWithoutFit = state.requirements.filter(
    (item) => item.description && !item.fitCriterion.trim()
  ).length;
  if (requirementsWithoutFit) {
    gaps.push({
      blockId: "priorizacao",
      title: "Requisitos sem métrica objetiva",
      detail: `${requirementsWithoutFit} requisito(s) ainda não possuem fit criterion mensurável.`,
    });
  }

  return gaps;
}

function buildBacklogItems() {
  return state.requirements.map((requirement) => ({
    id: requirement.id,
    title: `${requirement.id} - ${requirement.title || "Sem título"}`,
    summary:
      requirement.acceptanceCriteria.trim() ||
      requirement.description.trim() ||
      "Detalhar comportamento esperado.",
    priority: requirement.priority || "Must",
    type: mapRequirementToBacklogType(requirement),
    verification: requirement.verificationMethod || "Teste",
  }));
}

function hydrateState() {
  state.project = { ...initialState.project, ...state.project };
  state.blockQuestionIndex = state.blockQuestionIndex || {};
  blocks.forEach((block) => {
    if (typeof state.blockQuestionIndex[block.id] !== "number") {
      state.blockQuestionIndex[block.id] = resolveQuestionIndex(block.id);
    }
  });
}

function getAnsweredQuestionIndexes(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return [];

  const indexes = state.answers
    .filter((answer) => answer.blockId === blockId)
    .map((answer) => block.questions.indexOf(answer.question))
    .filter((index) => index >= 0);

  return [...new Set(indexes)].sort((a, b) => a - b);
}

function resolveQuestionIndex(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return 0;

  const answered = new Set(getAnsweredQuestionIndexes(blockId));
  const nextUnanswered = block.questions.findIndex((_, index) => !answered.has(index));
  if (nextUnanswered >= 0) return nextUnanswered;

  return Math.min(state.blockQuestionIndex?.[blockId] ?? 0, block.questions.length - 1);
}

function getQuestionIndexForBlock(blockId) {
  const resolved = resolveQuestionIndex(blockId);
  state.blockQuestionIndex[blockId] = resolved;
  return resolved;
}

function moveToNextQuestion() {
  const block = blocks[state.currentBlock];
  const currentIndex = getQuestionIndexForBlock(block.id);
  const answered = new Set(getAnsweredQuestionIndexes(block.id));

  for (let offset = 1; offset <= block.questions.length; offset += 1) {
    const candidate = (currentIndex + offset) % block.questions.length;
    if (!answered.has(candidate)) {
      state.blockQuestionIndex[block.id] = candidate;
      renderInterview();
      showProgressToast(`Pergunta ${candidate + 1}/${block.questions.length}`);
      return;
    }
  }

  state.blockQuestionIndex[block.id] = (currentIndex + 1) % block.questions.length;
  renderInterview();
  showProgressToast(`Pergunta ${state.blockQuestionIndex[block.id] + 1}/${block.questions.length}`);
}

function moveToNextBlock() {
  const currentBlockIndex = state.currentBlock;

  for (let offset = 1; offset <= blocks.length; offset += 1) {
    const candidateIndex = (currentBlockIndex + offset) % blocks.length;
    const candidateBlock = blocks[candidateIndex];
    const answeredCount = getAnsweredQuestionIndexes(candidateBlock.id).length;

    if (answeredCount < candidateBlock.questions.length) {
      state.currentBlock = candidateIndex;
      state.blockQuestionIndex[candidateBlock.id] = resolveQuestionIndex(candidateBlock.id);
      showProgressToast(`Bloco ${candidateIndex + 1}/${blocks.length}: ${candidateBlock.title}`);
      return;
    }
  }

  const fallbackIndex = (currentBlockIndex + 1) % blocks.length;
  state.currentBlock = fallbackIndex;
  state.blockQuestionIndex[blocks[fallbackIndex].id] = resolveQuestionIndex(blocks[fallbackIndex].id);
  showProgressToast(`Bloco ${fallbackIndex + 1}/${blocks.length}: ${blocks[fallbackIndex].title}`);
}

function advanceAfterAnswer(blockId) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;

  const answeredCount = getAnsweredQuestionIndexes(block.id).length;
  if (answeredCount >= block.questions.length) {
    moveToNextBlock();
    return;
  }

  state.blockQuestionIndex[block.id] = resolveQuestionIndex(block.id);
  showProgressToast(`Resposta salva em ${block.title}`);
}

function defaultAdaptiveQuestionsForBlock(block) {
  const map = {
    contexto: [
      "Qual evento concreto disparou esta demanda agora?",
      "Se nada mudar nos próximos meses, qual consequência mais pesa para o negócio?",
      "Existe um caso real recente que represente bem o problema?"
    ],
    objetivos: [
      "Qual indicador precisa mudar primeiro para a solução ser percebida como bem-sucedida?",
      "Qual meta mínima torna a entrega aceitável no curto prazo?",
      "Como esse resultado será acompanhado após a implantação?"
    ],
    stakeholders: [
      "Quem aprova, quem opera e quem será cobrado pelo resultado?",
      "Há conflito de interesse entre áreas envolvidas?",
      "Quem pode bloquear a solução mesmo sem usar o sistema?"
    ],
    processo: [
      "Quais entradas iniciam o fluxo e quais saídas encerram o processo?",
      "Onde há passagem de contexto entre pessoas ou sistemas?",
      "Que artefato ou evidência comprova que o fluxo terminou corretamente?"
    ],
    dores: [
      "Qual etapa gera mais retrabalho ou necessidade de interpretação?",
      "Que erro custa mais tempo, dinheiro ou confiança?",
      "O que hoje depende de planilhas, atalhos ou controles paralelos?"
    ],
    regras: [
      "Qual regra é mandatória e qual é convenção operacional?",
      "Que exceção precisa existir para não travar o negócio?",
      "O que deve ser bloqueado automaticamente sem opção de contorno?"
    ],
    funcionais: [
      "Qual ação principal o usuário precisa executar sem fricção?",
      "Que saída precisa ser gerada para apoiar decisão ou operação?",
      "Que informação deve estar disponível no momento da execução?"
    ],
    nfr: [
      "Qual limite de tempo, volume ou disponibilidade é aceitável?",
      "Que evidência de auditoria precisa ficar registrada?",
      "Existe requisito de acesso, retenção ou segregação de perfis?"
    ],
    restricoes: [
      "Que limitação técnica ou organizacional define a solução possível?",
      "Quais integrações ou equipes externas condicionam a entrega?",
      "Há política, contrato ou norma que impeça abordagens alternativas?"
    ],
    priorizacao: [
      "O que precisa entrar na primeira entrega para gerar valor real?",
      "O que pode ficar fora do MVP sem comprometer adoção?",
      "Como cada requisito será homologado ou aceito?"
    ],
  };

  return map[block.id] || [
    "Pode descrever um caso real recente, com entrada, decisão tomada, saída gerada e resultado esperado?",
    "O que nunca deve ser permitido nesse cenário?",
    "Como provar, objetivamente, que isso está correto?"
  ];
}

function buildTraceabilityRows() {
  const objective = state.project.primaryGoal || state.project.businessProblem || "Objetivo não informado";
  return state.requirements.map((requirement) => ({
    id: requirement.id,
    category: requirement.category || "Não informada",
    source: requirement.source || requirement.stakeholder || "Não informada",
    objective,
    verification: requirement.acceptanceCriteria || requirement.verificationMethod || "Não definido",
  }));
}

function buildMinutesModel() {
  const highlights = state.answers
    .slice(0, 6)
    .map((answer) => `${answer.blockTitle}: ${truncate(answer.text, 160)}`);
  const actions = buildBacklogItems()
    .slice(0, 6)
    .map((item) => `${item.title} (${item.priority}) - ${item.summary}`);
  const pending = computeSessionGaps().slice(0, 6).map((gap) => `${gap.title} - ${gap.detail}`);

  return {
    projectName: state.project.projectName || "Sessão sem nome",
    client: state.project.client || "Não informado",
    facilitator: state.project.facilitator || "Não informado",
    sessionDate: formatDateForDisplay(state.project.sessionDate),
    meetingType: state.project.meetingType || "Não informado",
    objective:
      state.project.primaryGoal ||
      state.project.businessProblem ||
      "Consolidar entendimento e registrar requisitos verificáveis.",
    highlights: highlights.length ? highlights : ["Nenhum ponto registrado ainda."],
    actions: actions.length ? actions : ["Nenhum encaminhamento derivado ainda."],
    pending: pending.length ? pending : ["Nenhuma pendência crítica detectada."],
  };
}

function assessRequirement(requirement) {
  if (!requirement) {
    return [
      {
        label: "Nenhum requisito selecionado",
        message: "Crie ou selecione um requisito para ver a avaliação.",
        ok: false,
      },
    ];
  }

  const vagueTerms = /rápido|fácil|simples|adequado|eficiente|intuitivo|melhor/i;
  const metricPattern = /\d|\b(segundo|minuto|hora|dia|%|percent|ms|kb|mb|gb)\b/i;
  const hasActor = /\b(usuário|cliente|analista|gestor|sistema|operador|aprovador)\b/i;

  return [
    {
      label: "Clareza",
      ok: requirement.description.trim().length > 20 && !vagueTerms.test(requirement.description),
      message: requirement.description.trim().length > 20 && !vagueTerms.test(requirement.description)
        ? "A descrição evita termos vagos e já tem detalhe suficiente."
        : "Detalhe melhor a descrição e evite palavras vagas como 'rápido', 'simples' ou 'adequado'.",
    },
    {
      label: "Necessidade e racional",
      ok: requirement.rationale.trim().length > 12,
      message: requirement.rationale.trim().length > 12
        ? "O requisito está ligado a uma motivação explícita."
        : "Explique por que este requisito existe e que dor ou objetivo ele atende.",
    },
    {
      label: "Testabilidade",
      ok:
        requirement.acceptanceCriteria.trim().length > 12 &&
        metricPattern.test(`${requirement.acceptanceCriteria} ${requirement.fitCriterion}`),
      message:
        requirement.acceptanceCriteria.trim().length > 12 &&
        metricPattern.test(`${requirement.acceptanceCriteria} ${requirement.fitCriterion}`)
          ? "Há critério de aceitação e métrica observável."
          : "Inclua uma evidência objetiva, idealmente com número, tempo, taxa ou limiar.",
    },
    {
      label: "Rastreabilidade",
      ok: requirement.source.trim().length > 4 && requirement.stakeholder.trim().length > 3,
      message:
        requirement.source.trim().length > 4 && requirement.stakeholder.trim().length > 3
          ? "A fonte e o stakeholder estão registrados."
          : "Preencha origem e stakeholder fonte para permitir rastreabilidade.",
    },
    {
      label: "Forma atômica",
      ok:
        !/\be\b.+\be\b/i.test(requirement.title) &&
        hasActor.test(`${requirement.description} ${requirement.acceptanceCriteria}`),
      message:
        !/\be\b.+\be\b/i.test(requirement.title) &&
        hasActor.test(`${requirement.description} ${requirement.acceptanceCriteria}`)
          ? "O requisito parece concentrado em uma exigência observável."
          : "Evite misturar várias exigências e explicite ator, condição ou comportamento esperado.",
    },
  ];
}

function buildRequirementFromAnswer(answer, category) {
  const sentence = answer.trim().replace(/\s+/g, " ");
  return {
    ...emptyRequirement(),
    id: nextRequirementId(),
    title: sentence.split(/[.!?]/)[0].slice(0, 72) || "Novo requisito",
    description: sentence,
    category,
    acceptanceCriteria: "Definir cenário verificável, entrada, comportamento esperado e saída observável.",
  };
}

function emptyRequirement() {
  return {
    id: nextRequirementId(),
    title: "",
    description: "",
    category: "Funcional",
    priority: "Must",
    stakeholder: "",
    source: "",
    rationale: "",
    acceptanceCriteria: "",
    fitCriterion: "",
    verificationMethod: "Teste",
    dependencies: "",
    risks: "",
    impacts: "",
    notes: "",
  };
}

function nextRequirementId() {
  const max = state.requirements.reduce((acc, item) => {
    const num = Number(item.id.replace("REQ-", ""));
    return Number.isFinite(num) ? Math.max(acc, num) : acc;
  }, 0);
  return `REQ-${String(max + 1).padStart(3, "0")}`;
}

function fillCategoryOptions() {
  const select = els.requirementForm.elements.category;
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

function formToRequirement() {
  const data = Object.fromEntries(new FormData(els.requirementForm).entries());
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority,
    stakeholder: data.stakeholder,
    source: data.source,
    rationale: data.rationale,
    acceptanceCriteria: data.acceptanceCriteria,
    fitCriterion: data.fitCriterion,
    verificationMethod: data.verificationMethod,
    dependencies: data.dependencies,
    risks: data.risks,
    impacts: data.impacts,
    notes: data.notes,
  };
}

function getSelectedRequirement() {
  return state.requirements.find((item) => item.id === state.selectedRequirementId) || null;
}

function exportMarkdown() {
  const project = state.project;
  const requirementSections = state.requirements
    .map(
      (req) => `## ${req.id} - ${req.title || "Sem título"}

- Categoria: ${req.category}
- Prioridade: ${req.priority}
- Stakeholder fonte: ${req.stakeholder || "Não informado"}
- Origem: ${req.source || "Não informada"}
- Método de verificação: ${req.verificationMethod}
- Dependências: ${req.dependencies || "Nenhuma"}
- Riscos: ${req.risks || "Nenhum"}
- Impactos: ${req.impacts || "Nenhum"}

### Descrição
${req.description || "Sem descrição."}

### Racional
${req.rationale || "Sem racional."}

### Critério de aceitação
${req.acceptanceCriteria || "Sem critério de aceitação."}

### Fit criterion
${req.fitCriterion || "Sem fit criterion."}

### Exceções e observações
${req.notes || "Sem observações."}
`
    )
    .join("\n");

  const answersSection = state.answers
    .map(
      (answer) => `- [${answer.blockTitle}] ${answer.question}\n  ${answer.text.replace(/\n/g, "\n  ")}`
    )
    .join("\n");

  const gapsSection = computeSessionGaps()
    .map((gap) => `- ${gap.title}: ${gap.detail}`)
    .join("\n");

  return `# ${project.projectName || "Sessão de Elicitação"}

## Contexto

- Cliente / área: ${project.client || "Não informado"}
- Domínio: ${project.domain || "Não informado"}
- Objetivo principal: ${project.primaryGoal || "Não informado"}

## Problema de negócio

${project.businessProblem || "Não informado"}

## Critério de sucesso

${project.successMetric || "Não informado"}

## Respostas capturadas

${answersSection || "- Nenhuma resposta capturada"}

## Requisitos atômicos

${requirementSections || "Nenhum requisito criado."}

## Lacunas detectadas

${gapsSection || "- Nenhuma lacuna crítica detectada"}
`;
}

function exportBacklogMarkdown() {
  const items = buildBacklogItems()
    .map(
      (item) => `- [ ] ${item.title}
  - Tipo: ${item.type}
  - Prioridade: ${item.priority}
  - Verificação: ${item.verification}
  - Resumo: ${item.summary}`
    )
    .join("\n");

  return `# Backlog Inicial - ${state.project.projectName || "Sessão de Elicitação"}

${items || "- Nenhum item disponível"}
`;
}

function exportTraceabilityMarkdown() {
  const rows = buildTraceabilityRows()
    .map(
      (row) =>
        `| ${row.id} | ${row.category} | ${row.source} | ${row.objective} | ${row.verification} |`
    )
    .join("\n");

  return `# Matriz de Rastreabilidade - ${state.project.projectName || "Sessão de Elicitação"}

| Req | Categoria | Fonte | Objetivo / problema | Verificação |
| --- | --- | --- | --- | --- |
${rows || "| - | - | - | - | - |"}
`;
}

function exportMinutesMarkdown() {
  const minutes = buildMinutesModel();
  return `# Ata da Sessão - ${minutes.projectName}

## Contexto

- Cliente / área: ${minutes.client}
- Facilitador: ${minutes.facilitator}
- Data: ${minutes.sessionDate}
- Tipo de reunião: ${minutes.meetingType}

## Objetivo

${minutes.objective}

## Principais pontos levantados

${minutes.highlights.map((item) => `- ${item}`).join("\n")}

## Decisões e encaminhamentos

${minutes.actions.map((item) => `- ${item}`).join("\n")}

## Pendências

${minutes.pending.map((item) => `- ${item}`).join("\n")}
`;
}

function syncProjectForm() {
  Object.entries(state.project).forEach(([key, value]) => {
    if (els.projectForm.elements[key]) {
      els.projectForm.elements[key].value = value;
    }
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialState);

    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(initialState),
      ...parsed,
      project: {
        ...structuredClone(initialState.project),
        ...(parsed.project || {}),
      },
      blockQuestionIndex: {
        ...(parsed.blockQuestionIndex || {}),
      },
    };
  } catch {
    return structuredClone(initialState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetSession() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, structuredClone(initialState));
  hydrateState();
  render();
  persist();
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatDateForDisplay(raw) {
  if (!raw) return "Não informada";
  const date = new Date(`${raw}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

function mapRequirementToBacklogType(requirement) {
  if (requirement.category === "NFR") return "Critério de qualidade";
  if (requirement.category === "Regra") return "Regra de negócio";
  if (requirement.category === "Integração") return "Integração";
  if (requirement.category === "Restrição") return "Restrição operacional";
  return "História / item funcional";
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

let toastTimer = null;

function showProgressToast(message) {
  if (!els.progressToast || !els.progressToastMessage) return;
  els.progressToastMessage.textContent = message;
  els.progressToast.classList.add("is-visible");

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    els.progressToast.classList.remove("is-visible");
  }, 2300);
}

const englishTerms = [
  ["workspace", "espaco de trabalho"],
  ["backlog", "lista de pendencias"],
  ["stakeholder", "parte interessada"],
  ["requirement", "requisito"],
  ["artifact", "artefato"],
  ["traceability", "rastreabilidade"],
  ["minutes", "ata"],
  ["fit criterion", "criterio de ajuste"],
  ["nfr", "req. nao funcional"],
  ["mvp", "produto minimo viavel"],
  ["kickoff", "reuniao inicial"],
  ["deadline", "prazo final"],
  ["release", "entrega"],
  ["sprint", "iteracao"],
  ["bug", "erro"],
  ["feature", "funcionalidade"],
  ["issue", "problema"],
  ["ticket", "chamado"],
  ["scope", "escopo"],
  ["roadmap", "plano de evolucao"],
  ["pipeline", "fluxo"],
  ["onboarding", "integracao"],
  ["feedback", "retorno"],
  ["insight", "percepcao"],
  ["checklist", "lista de verificacao"],
  ["milestone", "marco"],
  ["deliverable", "entregavel"],
  ["out-of-scope", "fora do escopo"],
  ["in-scope", "no escopo"],
];

function applyEnglishLabels() {
  const targets = document.querySelectorAll(
    ".global-nav__title, .global-nav__subtitle, .topbar h2, .eyebrow, .mini-label, .artifact-tab, .section-title-row h2, #interview-title, #interview-purpose, #current-question, #current-question-progress, .traceability-table th"
  );

  targets.forEach((el) => {
    if (el.dataset.labelsApplied === "true") return;

    const original = el.textContent || "";
    const lowered = original.toLowerCase();
    const labels = englishTerms
      .filter(([term]) => lowered.includes(term))
      .map(([term, translation]) => `${term}: ${translation}`);

    if (!labels.length) {
      el.dataset.labelsApplied = "true";
      return;
    }

    const label = document.createElement("span");
    label.className = "en-label";
    label.title = labels.join(" | ");
    label.textContent = "EN";
    el.appendChild(label);
    el.dataset.labelsApplied = "true";
  });
}

