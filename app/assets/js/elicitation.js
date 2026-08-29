const WORKSPACE_KEY = 'req-workspace-v3';
const LEGACY_KEY = 'req-codex-elicitation-v2';
const CARDS_KEY = 'createdCards';
const STEP_ORDER = ['setup', 'interview', 'synthesis', 'requirements', 'delivery'];

const QUESTIONS = [
  { id: 'process', field: 'currentProcess', topic: 'Processo atual', title: 'Conte como isso acontece hoje, do começo ao fim.', helper: 'Não precisa organizar a resposta. Registre a situação como ela realmente acontece.', placeholder: 'Ex.: O colaborador envia um e-mail, o gestor responde e depois o RH registra...' },
  { id: 'pain', field: 'problem', topic: 'Dores e impacto', title: 'Onde estão as maiores dificuldades ou fontes de retrabalho?', helper: 'Procure exemplos concretos: atrasos, erros, dúvidas recorrentes, riscos ou trabalho duplicado.', placeholder: 'Ex.: Ninguém sabe em qual etapa o pedido está e o RH precisa cobrar respostas...' },
  { id: 'actors', field: 'actors', topic: 'Pessoas envolvidas', title: 'Quem participa, aprova, opera ou é impactado por esse processo?', helper: 'Inclua pessoas, áreas e sistemas externos. Se possível, diga o papel de cada um.', placeholder: 'Ex.: Colaborador solicita; gestor aprova; RH valida e conclui...' },
  { id: 'outcome', field: 'behaviors', topic: 'Resultado esperado', title: 'O que precisa passar a acontecer para essa iniciativa ter sucesso?', helper: 'Descreva comportamentos e resultados, sem se preocupar ainda com telas ou tecnologia.', placeholder: 'Ex.: O colaborador deve acompanhar o status e o RH deve receber apenas pedidos aprovados...' },
  { id: 'rules', field: 'rules', topic: 'Regras essenciais', title: 'Qual regra nunca pode ser quebrada?', helper: 'Pense em aprovações, prazos, permissões, cálculos, limites e obrigações legais.', placeholder: 'Ex.: O RH só pode concluir um pedido depois da aprovação do gestor...' },
  { id: 'exceptions', field: 'exceptions', topic: 'Exceções e riscos', title: 'Que situações fogem do fluxo normal ou costumam gerar dúvidas?', helper: 'Casos especiais revelam requisitos que normalmente ficam escondidos.', placeholder: 'Ex.: O gestor está afastado; o pedido tem menos de 30 dias; existem férias coletivas...' },
  { id: 'evidence', field: 'successCriteria', topic: 'Evidência de sucesso', title: 'Como o time poderá observar que a solução funcionou?', helper: 'Descreva sinais verificáveis, resultados e cenários que poderão ser testados.', placeholder: 'Ex.: Cada pessoa vê o status correto e o RH recebe a solicitação em até 1 minuto...' },
];

const FINDINGS = [
  { key: 'currentProcess', label: 'Processo atual', questionId: 'process' },
  { key: 'problem', label: 'Problemas e impacto', questionId: 'pain' },
  { key: 'actors', label: 'Pessoas envolvidas', questionId: 'actors' },
  { key: 'behaviors', label: 'Resultado esperado', questionId: 'outcome' },
  { key: 'rules', label: 'Regras confirmadas', questionId: 'rules' },
  { key: 'exceptions', label: 'Exceções e riscos', questionId: 'exceptions' },
  { key: 'successCriteria', label: 'Evidências de sucesso', questionId: 'evidence' },
];

const METHOD_LABELS = { guided: 'Entrevista guiada', import: 'Notas importadas', manual: 'Modo manual' };
const STATUS_LABELS = { setup: 'Em preparação', interview: 'Em conversa', synthesis: 'Em revisão', requirements: 'Revisando requisitos', delivery: 'Pronto para entregar', completed: 'Concluído' };

const els = {
  homeView: document.querySelector('#home-view'), journey: document.querySelector('#journey'), sessionsList: document.querySelector('#sessions-list'), sessionTotal: document.querySelector('#session-total'),
  workspaceTitle: document.querySelector('#workspace-title'), workspaceDescription: document.querySelector('#workspace-description'), autosave: document.querySelector('#autosave-indicator'), goHome: document.querySelector('#go-home'),
  newSession: document.querySelector('#new-session'), homeNewSession: document.querySelector('#home-new-session'), progress: document.querySelector('#journey-progress'),
  setupForm: document.querySelector('#setup-form'), importNotesField: document.querySelector('#import-notes-field'), startSession: document.querySelector('#start-session'),
  questionCounter: document.querySelector('#question-counter'), questionBar: document.querySelector('#question-progress-bar'), questionTopic: document.querySelector('#question-topic'), questionTitle: document.querySelector('#question-title'), questionHelper: document.querySelector('#question-helper'), questionAnswer: document.querySelector('#question-answer'), answerSignal: document.querySelector('#answer-signal'), answersCount: document.querySelector('#answers-count'), capturedTopics: document.querySelector('#captured-topics'),
  previousQuestion: document.querySelector('#previous-question'), nextQuestion: document.querySelector('#next-question'), skipQuestion: document.querySelector('#skip-question'),
  synthesisNarrative: document.querySelector('#synthesis-narrative'), synthesisStatus: document.querySelector('#synthesis-status'), findingsList: document.querySelector('#findings-list'),
  requirementsList: document.querySelector('#requirements-list'), requirementForm: document.querySelector('#requirement-form'), requirementEmpty: document.querySelector('#requirement-empty'), requirementEditor: document.querySelector('#requirement-editor'), requirementId: document.querySelector('#requirement-id'), requirementState: document.querySelector('#requirement-state'), requirementSource: document.querySelector('#requirement-source'), qualityTitle: document.querySelector('#quality-title'), qualityScore: document.querySelector('#quality-score'), qualityList: document.querySelector('#quality-list'), approvedCount: document.querySelector('#approved-count'), pendingCount: document.querySelector('#pending-count'),
  workspaceSyncLabel: document.querySelector('#workspace-sync-label'), metricTraced: document.querySelector('#metric-traced'), metricReview: document.querySelector('#metric-review'), metricImpact: document.querySelector('#metric-impact'), workspaceActivity: document.querySelector('#workspace-activity'),
  changeImpact: document.querySelector('#change-impact'), changeImpactCopy: document.querySelector('#change-impact-copy'), traceCoverage: document.querySelector('#trace-coverage'), traceSource: document.querySelector('#trace-source'), traceRequirement: document.querySelector('#trace-requirement'), traceCard: document.querySelector('#trace-card'), dependencySelect: document.querySelector('#dependency-select'), dependencyList: document.querySelector('#dependency-list'), requirementHistory: document.querySelector('#requirement-history'), requirementVersion: document.querySelector('#requirement-version'), requirementComments: document.querySelector('#requirement-comments'), commentCount: document.querySelector('#comment-count'), commentInput: document.querySelector('#comment-input'),
  deliveryApproved: document.querySelector('#delivery-approved'), deliveryQuestions: document.querySelector('#delivery-questions'), deliveryCards: document.querySelector('#delivery-cards'), deliveryMessage: document.querySelector('#delivery-message'), toast: document.querySelector('#toast'),
};

let currentUser = { id: 'local', name: 'Usuário local' };
let workspace = loadWorkspace();
let state = null;
let usersDirectory = [];
let cloudAvailable = false;
let cloudSaveTimer;
let cloudSaveInFlight = false;
let saveTimer;
let toastTimer;

boot();

async function boot() {
  const auth = await window.ReqAuth.requireAuth();
  currentUser = auth.user || currentUser;
  await loadCloudWorkspace();
  try {
    const payload = await window.ReqAuth.getUsers();
    usersDirectory = payload.users || [];
  } catch {
    usersDirectory = [];
  }
  wireEvents();
  showHome();
  if (workspace.needsCloudMigration) scheduleCloudPersist(50);
}

function wireEvents() {
  els.newSession.addEventListener('click', beginNewSession);
  els.homeNewSession.addEventListener('click', beginNewSession);
  els.goHome.addEventListener('click', showHome);
  document.querySelector('#cancel-setup').addEventListener('click', showHome);

  document.querySelectorAll('input[name="entryMode"]').forEach((radio) => radio.addEventListener('change', () => {
    if (!state) return;
    state.entryMode = radio.value;
    syncMethodCards();
    schedulePersist();
  }));

  els.setupForm.addEventListener('input', syncStateFromSetup);
  els.setupForm.addEventListener('submit', startPreparedSession);

  els.questionAnswer.addEventListener('input', () => {
    const question = QUESTIONS[state.currentQuestionIndex];
    state.answers[question.id] = els.questionAnswer.value;
    state.skipped = state.skipped.filter((id) => id !== question.id);
    renderAnswerSignal();
    renderInterviewContext();
    schedulePersist();
  });
  els.previousQuestion.addEventListener('click', () => moveQuestion(-1));
  els.nextQuestion.addEventListener('click', () => moveQuestion(1));
  els.skipQuestion.addEventListener('click', skipQuestion);
  document.querySelector('#finish-interview-early').addEventListener('click', prepareSynthesis);

  els.findingsList.addEventListener('click', onFindingAction);
  document.querySelector('#back-to-interview').addEventListener('click', () => goStep('interview'));
  document.querySelector('#generate-drafts').addEventListener('click', generateDraftsAndContinue);

  els.requirementsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-requirement-id]');
    if (!button) return;
    state.selectedRequirementId = button.dataset.requirementId;
    persist();
    renderRequirements();
  });
  document.querySelector('#add-requirement').addEventListener('click', addRequirement);
  els.requirementForm.addEventListener('submit', (event) => { event.preventDefault(); saveCurrentRequirement(); showToast('Alterações salvas.'); });
  els.requirementForm.addEventListener('input', () => { renderLiveQuality(); renderChangeImpactPreview(); });
  document.querySelector('#approve-requirement').addEventListener('click', approveRequirement);
  document.querySelector('#reject-requirement').addEventListener('click', rejectRequirement);
  document.querySelector('#delete-requirement').addEventListener('click', deleteRequirement);
  document.querySelector('#return-to-source').addEventListener('click', returnToRequirementSource);
  document.querySelector('#add-dependency').addEventListener('click', addDependency);
  els.dependencyList.addEventListener('click', removeDependency);
  document.querySelector('#add-comment').addEventListener('click', addRequirementComment);
  document.querySelector('#back-to-synthesis').addEventListener('click', () => goStep('synthesis'));
  document.querySelector('#go-to-delivery').addEventListener('click', goToDelivery);

  document.querySelector('#back-to-requirements').addEventListener('click', () => goStep('requirements'));
  document.querySelector('#send-to-cards').addEventListener('click', sendApprovedToCards);
  document.querySelector('#export-markdown').addEventListener('click', exportMarkdown);
  document.querySelector('#export-json').addEventListener('click', exportJson);
  document.querySelector('#finish-session').addEventListener('click', finishSession);

  els.progress.addEventListener('click', (event) => {
    const target = event.target.closest('[data-step-target]');
    if (!target || target.disabled) return;
    goStep(target.dataset.stepTarget);
  });

  els.sessionsList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-session-id]');
    if (!card) return;
    openSession(card.dataset.sessionId);
  });
  els.sessionsList.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const card = event.target.closest('[data-session-id]');
    if (!card) return;
    event.preventDefault();
    openSession(card.dataset.sessionId);
  });
}

function beginNewSession() {
  state = createSession();
  workspace.sessions.unshift(state);
  workspace.activeSessionId = state.id;
  recordActivity('session-created', `iniciou o levantamento “${state.projectName || 'Novo levantamento'}”`, { sessionId: state.id });
  persist();
  showJourney();
  syncSetupForm();
  goStep('setup', true);
}

function openSession(id) {
  state = workspace.sessions.find((session) => session.id === id);
  if (!state) return;
  hydrateSession(state);
  workspace.activeSessionId = state.id;
  persist();
  showJourney();
  syncSetupForm();
  goStep(state.currentStep || 'setup', true);
}

function showHome() {
  if (state) persist();
  state = null;
  workspace.activeSessionId = null;
  persistWorkspace();
  els.homeView.hidden = false;
  els.journey.hidden = true;
  els.goHome.hidden = true;
  els.autosave.hidden = true;
  els.workspaceTitle.textContent = 'Levantamentos';
  els.workspaceDescription.textContent = 'Transforme conversas em decisões claras e cards prontos para execução.';
  renderSessions();
  renderIntelligenceOverview();
}

function showJourney() {
  els.homeView.hidden = true;
  els.journey.hidden = false;
  els.goHome.hidden = false;
  els.autosave.hidden = false;
  updateWorkspaceHeader();
}

function renderSessions() {
  const sessions = [...workspace.sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  els.sessionTotal.textContent = `${sessions.length} ${sessions.length === 1 ? 'levantamento' : 'levantamentos'}`;
  if (!sessions.length) {
    els.sessionsList.innerHTML = '<div class="session-empty"><strong>Nenhum levantamento ainda</strong><p>Comece uma conversa guiada e o Req. salvará o progresso automaticamente.</p></div>';
    return;
  }
  els.sessionsList.innerHTML = sessions.map((session) => {
    const approved = session.requirements.filter((item) => item.status === 'approved').length;
    return `<article class="session-card" data-session-id="${session.id}" tabindex="0">
      <div class="session-card__top"><span class="session-card__method">${METHOD_LABELS[session.entryMode]}</span><span class="session-card__status">${STATUS_LABELS[session.status] || STATUS_LABELS[session.currentStep]}</span></div>
      <h3>${escapeHtml(session.projectName || 'Levantamento sem nome')}</h3>
      <p>${escapeHtml(session.primaryGoal || 'Objetivo ainda não definido.')}</p>
      <div class="session-card__footer"><span>${approved} ${approved === 1 ? 'aprovado' : 'aprovados'}</span><span>Atualizado ${formatRelativeDate(session.updatedAt)}</span></div>
    </article>`;
  }).join('');
}

function renderIntelligenceOverview() {
  const requirements = workspace.sessions.flatMap((session) => session.requirements || []);
  const traced = requirements.filter((item) => item.source?.text).length;
  const pending = requirements.filter((item) => item.status === 'draft').length;
  const impacted = requirements.filter((item) => item.impactStatus === 'review-required').length;
  els.metricTraced.textContent = String(traced);
  els.metricReview.textContent = String(pending);
  els.metricImpact.textContent = String(impacted);
  els.workspaceSyncLabel.textContent = cloudAvailable ? 'Workspace compartilhado' : 'Salvo neste dispositivo';
  els.workspaceSyncLabel.classList.toggle('is-cloud', cloudAvailable);
  const activities = (workspace.activity || []).slice(0, 4);
  els.workspaceActivity.innerHTML = activities.length ? activities.map((item) => `<article class="activity-item"><span class="activity-item__avatar">${escapeHtml(initials(item.actor?.name || 'Req.'))}</span><div><p><strong>${escapeHtml(item.actor?.name || 'Req.')}</strong> ${escapeHtml(item.message)}</p><time datetime="${item.createdAt}">${formatRelativeDateTime(item.createdAt)}</time></div></article>`).join('') : '<p class="activity-empty">As decisões e mudanças importantes aparecerão aqui.</p>';
}

function syncStateFromSetup() {
  if (!state) return;
  const formData = new FormData(els.setupForm);
  ['primaryGoal', 'projectName', 'stakeholder', 'client', 'facilitator', 'importNotes'].forEach((key) => { state[key] = String(formData.get(key) || ''); });
  updateWorkspaceHeader();
  schedulePersist();
}

function syncSetupForm() {
  ['primaryGoal', 'projectName', 'stakeholder', 'client', 'facilitator', 'importNotes'].forEach((key) => {
    if (els.setupForm.elements[key]) els.setupForm.elements[key].value = state[key] || '';
  });
  const radio = document.querySelector(`input[name="entryMode"][value="${state.entryMode}"]`);
  if (radio) radio.checked = true;
  syncMethodCards();
}

function syncMethodCards() {
  document.querySelectorAll('.method-card').forEach((card) => card.classList.toggle('is-selected', card.querySelector('input').checked));
  const isImport = state?.entryMode === 'import';
  els.importNotesField.hidden = !isImport;
  els.startSession.innerHTML = state?.entryMode === 'guided' ? 'Começar conversa <span aria-hidden="true">→</span>' : state?.entryMode === 'import' ? 'Revisar notas <span aria-hidden="true">→</span>' : 'Abrir síntese <span aria-hidden="true">→</span>';
}

function startPreparedSession(event) {
  event.preventDefault();
  syncStateFromSetup();
  if (!state.primaryGoal.trim() || !state.projectName.trim()) return;
  if (state.entryMode === 'import' && !state.importNotes.trim()) {
    showToast('Cole as notas ou a ata antes de continuar.');
    els.setupForm.elements.importNotes.focus();
    return;
  }
  if (state.entryMode === 'guided') {
    state.maxStep = Math.max(state.maxStep, 1);
    goStep('interview', true);
  } else {
    if (state.entryMode === 'import') extractSummariesFromNotes(state.importNotes);
    if (state.entryMode === 'manual') state.summaries.behaviors ||= state.primaryGoal;
    state.maxStep = Math.max(state.maxStep, 2);
    goStep('synthesis', true);
  }
}

function goStep(step, force = false) {
  if (!state) return;
  const index = STEP_ORDER.indexOf(step);
  if (index < 0 || (!force && index > state.maxStep)) return;
  state.currentStep = step;
  state.status = step;
  document.querySelectorAll('[data-step-panel]').forEach((panel) => { panel.hidden = panel.dataset.stepPanel !== step; });
  renderProgress();
  if (step === 'setup') syncSetupForm();
  if (step === 'interview') renderInterview();
  if (step === 'synthesis') renderSynthesis();
  if (step === 'requirements') renderRequirements();
  if (step === 'delivery') renderDelivery();
  updateWorkspaceHeader();
  persist();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderProgress() {
  const current = STEP_ORDER.indexOf(state.currentStep);
  els.progress.querySelectorAll('[data-step-target]').forEach((button, index) => {
    button.classList.toggle('is-current', index === current);
    button.classList.toggle('is-complete', index < current || index < state.maxStep);
    button.disabled = index > state.maxStep;
    button.setAttribute('aria-current', index === current ? 'step' : 'false');
  });
}

function renderInterview() {
  state.currentQuestionIndex = Math.max(0, Math.min(QUESTIONS.length - 1, state.currentQuestionIndex));
  const question = QUESTIONS[state.currentQuestionIndex];
  els.questionCounter.textContent = `Pergunta ${state.currentQuestionIndex + 1} de ${QUESTIONS.length}`;
  els.questionBar.style.width = `${((state.currentQuestionIndex + 1) / QUESTIONS.length) * 100}%`;
  els.questionTopic.textContent = question.topic;
  els.questionTitle.textContent = question.title;
  els.questionHelper.textContent = question.helper;
  els.questionAnswer.placeholder = question.placeholder;
  els.questionAnswer.value = state.answers[question.id] || '';
  els.previousQuestion.disabled = state.currentQuestionIndex === 0;
  els.nextQuestion.innerHTML = state.currentQuestionIndex === QUESTIONS.length - 1 ? 'Revisar entendimento <span aria-hidden="true">→</span>' : 'Continuar <span aria-hidden="true">→</span>';
  renderAnswerSignal();
  renderInterviewContext();
}

function renderAnswerSignal() {
  const value = els.questionAnswer.value.trim();
  els.answerSignal.classList.toggle('is-ready', value.length >= 20);
  els.answerSignal.textContent = value.length >= 20 ? 'Resposta registrada. Você poderá ajustá-la na revisão.' : 'Responda com suas palavras. Você poderá revisar tudo depois.';
}

function renderInterviewContext() {
  const answered = QUESTIONS.filter((question) => String(state.answers[question.id] || '').trim()).length;
  els.answersCount.textContent = `${answered}/${QUESTIONS.length}`;
  els.capturedTopics.innerHTML = QUESTIONS.map((question) => `<div class="captured-topic ${state.answers[question.id]?.trim() ? 'is-captured' : ''}">${question.topic}</div>`).join('');
}

function moveQuestion(direction) {
  const current = QUESTIONS[state.currentQuestionIndex];
  state.answers[current.id] = els.questionAnswer.value;
  if (direction > 0 && !state.answers[current.id].trim() && !state.skipped.includes(current.id)) {
    els.answerSignal.textContent = 'Responda ou use “Não sei ainda” para continuar.';
    els.answerSignal.classList.remove('is-ready');
    els.questionAnswer.focus();
    return;
  }
  if (direction > 0 && state.currentQuestionIndex === QUESTIONS.length - 1) {
    prepareSynthesis();
    return;
  }
  state.currentQuestionIndex = Math.max(0, Math.min(QUESTIONS.length - 1, state.currentQuestionIndex + direction));
  persist();
  renderInterview();
  els.questionAnswer.focus();
}

function skipQuestion() {
  const question = QUESTIONS[state.currentQuestionIndex];
  state.answers[question.id] = '';
  if (!state.skipped.includes(question.id)) state.skipped.push(question.id);
  if (state.currentQuestionIndex === QUESTIONS.length - 1) prepareSynthesis();
  else { state.currentQuestionIndex += 1; persist(); renderInterview(); }
}

function prepareSynthesis() {
  buildSummariesFromAnswers();
  state.maxStep = Math.max(state.maxStep, 2);
  goStep('synthesis', true);
}

function buildSummariesFromAnswers() {
  QUESTIONS.forEach((question) => {
    const value = String(state.answers[question.id] || '').trim();
    if (value) state.summaries[question.field] = value;
  });
  state.summaries.objective = state.primaryGoal;
  state.summaries.questions = state.skipped.map((id) => QUESTIONS.find((question) => question.id === id)?.title).filter(Boolean).join('\n');
  state.rawNotes = QUESTIONS.filter((question) => state.answers[question.id]?.trim()).map((question) => `${question.title}\n${state.answers[question.id].trim()}`).join('\n\n');
}

function extractSummariesFromNotes(notes) {
  const lines = splitIdeas(notes);
  const isSuccess = (line) => /sucesso|medir|percentual|resultado|teste|evidência|indicador|em até/i.test(line);
  const isException = (line) => /exce|caso|quando|^se\b|falha|ausente|afastado|retroativ|pendência|dúvida/i.test(line);
  const isRule = (line) => /regra|obrigat|nunca|somente|apenas|só pode|prazo|limite|política|restri|exige|exigem/i.test(line);
  const isProblem = (line) => /problema|\bdor(?:es)?\b|impacto|erro|retrabalho|lento|demora|falha|dificuldade|risco|falta de|ninguém/i.test(line);
  state.summaries.currentProcess = dedupe(lines.filter((line) => /hoje|atualmente|processo|fluxo|primeiro|depois|então|envia|recebe/i.test(line) && !isSuccess(line))).join('\n');
  state.summaries.problem = dedupe(lines.filter(isProblem)).join('\n');
  state.summaries.actors = extractActors(lines);
  state.summaries.rules = dedupe(lines.filter(isRule)).join('\n');
  state.summaries.exceptions = dedupe(lines.filter(isException)).join('\n');
  state.summaries.successCriteria = dedupe(lines.filter(isSuccess)).join('\n');
  state.summaries.behaviors = dedupe(lines.filter((line) => /precisa|deve|devem|permitir|acompanhar|exibir|criar|editar|calcular|gerar|enviar|validar|aprovar/i.test(line) && !isProblem(line) && !isRule(line) && !isException(line) && !isSuccess(line))).join('\n');
  state.summaries.objective = state.primaryGoal;
  state.summaries.currentProcess ||= lines.slice(0, 3).join('\n');
  state.summaries.problem ||= lines.find((line) => line.length > 25) || '';
  state.summaries.behaviors ||= lines.filter((line) => /deve|precisa|quer|espera/i.test(line)).slice(0, 4).join('\n');
  state.rawNotes = notes;
}

function extractActors(lines) {
  const knownActors = [
    [/\bcolaborador(?:a|es|as)?\b/i, 'Colaborador'],
    [/\bgestor(?:a|es|as)?\b/i, 'Gestor'],
    [/\bRH\b/i, 'RH'],
    [/\bfinanceir[oa]s?\b/i, 'Financeiro'],
    [/\bclientes?\b/i, 'Cliente'],
    [/\busu[aá]ri[oa]s?\b/i, 'Usuário'],
    [/\boperador(?:a|es|as)?\b/i, 'Operador'],
    [/\bequipe\b/i, 'Equipe'],
  ];
  return knownActors.filter(([pattern]) => lines.some((line) => pattern.test(line))).map(([, label]) => label).join(', ');
}

function renderSynthesis() {
  const actors = state.summaries.actors || state.stakeholder || 'as pessoas envolvidas';
  const problem = firstSentence(state.summaries.problem || state.summaries.currentProcess || 'o processo atual ainda precisa ser detalhado');
  const outcome = firstSentence(state.summaries.behaviors || state.primaryGoal);
  els.synthesisNarrative.textContent = `O levantamento busca ${lowercaseFirst(state.primaryGoal)}. ${capitalize(actors)} participam do contexto. O principal ponto identificado é ${lowercaseFirst(problem)}. O resultado esperado é ${lowercaseFirst(outcome)}.`;
  const reviewed = FINDINGS.filter((finding) => state.confirmedFindings.includes(finding.key)).length;
  els.synthesisStatus.textContent = `${reviewed} de ${FINDINGS.length} revisados`;
  els.findingsList.innerHTML = FINDINGS.map((finding) => renderFindingCard(finding)).join('');
}

function renderFindingCard(finding) {
  const value = String(state.summaries[finding.key] || '').trim();
  const editing = state.editingFinding === finding.key;
  const confirmed = state.confirmedFindings.includes(finding.key);
  return `<article class="finding-card ${confirmed ? 'is-confirmed' : ''} ${!value ? 'is-missing' : ''}" data-finding-key="${finding.key}">
    <div class="finding-card__head"><span>${finding.label}</span><span class="finding-card__state">${confirmed ? '✓ Confirmado' : value ? 'Revisar' : 'Em aberto'}</span></div>
    ${editing ? `<textarea aria-label="${finding.label}">${escapeHtml(value)}</textarea>` : `<p>${escapeHtml(value || 'Ainda não temos informação suficiente sobre este ponto.')}</p>`}
    <div class="finding-card__actions">
      ${editing ? `<button class="text-action" type="button" data-finding-action="save">Salvar</button>` : `<button class="text-action" type="button" data-finding-action="edit">${value ? 'Corrigir' : 'Adicionar'}</button>`}
      ${!editing && value ? `<button class="text-action" type="button" data-finding-action="confirm">${confirmed ? 'Reabrir' : 'Confirmar'}</button>` : ''}
      ${!editing && !value && state.entryMode === 'guided' ? '<button class="text-action" type="button" data-finding-action="answer">Responder na conversa</button>' : ''}
    </div>
  </article>`;
}

function onFindingAction(event) {
  const button = event.target.closest('[data-finding-action]');
  const card = event.target.closest('[data-finding-key]');
  if (!button || !card) return;
  const key = card.dataset.findingKey;
  const action = button.dataset.findingAction;
  if (action === 'edit') state.editingFinding = key;
  if (action === 'save') {
    state.summaries[key] = card.querySelector('textarea').value.trim();
    state.editingFinding = null;
    state.confirmedFindings = state.confirmedFindings.filter((item) => item !== key);
  }
  if (action === 'confirm') {
    state.confirmedFindings = state.confirmedFindings.includes(key) ? state.confirmedFindings.filter((item) => item !== key) : [...state.confirmedFindings, key];
  }
  if (action === 'answer') {
    const finding = FINDINGS.find((item) => item.key === key);
    state.currentQuestionIndex = QUESTIONS.findIndex((question) => question.id === finding.questionId);
    goStep('interview');
    return;
  }
  persist();
  renderSynthesis();
}

function generateDraftsAndContinue() {
  FINDINGS.forEach((finding) => { if (state.summaries[finding.key]?.trim() && !state.confirmedFindings.includes(finding.key)) state.confirmedFindings.push(finding.key); });
  if (!state.requirements.length) {
    state.requirements = createDraftRequirements();
    recordActivity('drafts-generated', `gerou ${state.requirements.length} rascunho${state.requirements.length === 1 ? '' : 's'} em “${state.projectName || 'Levantamento'}”`, { sessionId: state.id });
  }
  if (!state.requirements.length) state.requirements.push(createEmptyRequirement());
  state.selectedRequirementId = state.requirements.find((item) => item.status !== 'rejected')?.id || state.requirements[0].id;
  state.maxStep = Math.max(state.maxStep, 3);
  goStep('requirements', true);
}

function createDraftRequirements() {
  const drafts = [];
  const behaviors = splitIdeas(state.summaries.behaviors);
  const rules = splitIdeas(state.summaries.rules);
  behaviors.slice(0, 6).forEach((line, index) => drafts.push(buildRequirement(line, 'Funcional', 'outcome', index)));
  rules.slice(0, 4).forEach((line, index) => drafts.push(buildRequirement(line, 'Regra', 'rules', index)));
  if (state.summaries.exceptions.trim()) {
    drafts.push({ ...createRequirementBase(), title: 'Tratar exceções do fluxo', description: ensurePeriod(`O sistema deve tratar as exceções identificadas no levantamento: ${lowercaseFirst(firstSentence(state.summaries.exceptions))}`), type: 'Regra', priority: 'Should', acceptanceCriteria: buildAcceptance(state.summaries.exceptions), source: sourceFromQuestion('exceptions') });
  }
  if (!drafts.length && state.primaryGoal.trim()) drafts.push(buildRequirement(state.primaryGoal, 'Funcional', 'process', 0));
  const uniqueDrafts = drafts.filter((draft, index, items) => items.findIndex((item) => normalizeForComparison(item.description) === normalizeForComparison(draft.description)) === index);
  return uniqueDrafts.map((draft, index) => {
    const requirement = { ...draft, id: `REQ-${String(index + 1).padStart(3, '0')}` };
    initializeRequirementHistory(requirement, 'Rascunho gerado a partir das evidências');
    return requirement;
  });
}

function buildRequirement(line, type, questionId) {
  const clean = sanitizeLine(line);
  const source = sourceFromQuestion(questionId);
  const criteriaSource = state.summaries.successCriteria || clean;
  return {
    ...createRequirementBase(),
    title: deriveTitle(clean, type),
    description: normalizeRequirementDescription(clean),
    type,
    priority: type === 'Regra' ? 'Must' : 'Should',
    acceptanceCriteria: buildAcceptance(criteriaSource),
    notes: state.summaries.exceptions ? `Considerar exceções: ${firstSentence(state.summaries.exceptions)}` : '',
    source,
  };
}

function buildAcceptance(text) {
  const outcome = sanitizeLine(firstSentence(text)) || 'o comportamento esperado é executado';
  return `Dado que a pessoa está no fluxo relacionado\nQuando a ação prevista for realizada\nEntão ${lowercaseFirst(outcome)}`;
}

function normalizeRequirementDescription(value) {
  const clean = sanitizeLine(value);
  const alreadyNormative = /\b(deve|devem|deverá|deverão|pode|podem|precisa|precisam|exige|exigem|será|serão)\b/i.test(clean);
  return alreadyNormative ? ensurePeriod(capitalize(clean)) : ensurePeriod(`O sistema deve ${lowercaseFirst(clean)}`);
}

function sourceFromQuestion(questionId) {
  const question = QUESTIONS.find((item) => item.id === questionId);
  return { questionId, label: question?.topic || 'Contexto do levantamento', text: state.answers[questionId] || state.summaries[question?.field] || state.importNotes || state.rawNotes || state.primaryGoal };
}

function renderRequirements() {
  const approved = state.requirements.filter((item) => item.status === 'approved').length;
  const pending = state.requirements.filter((item) => item.status === 'draft').length;
  els.approvedCount.textContent = `${approved} ${approved === 1 ? 'aprovado' : 'aprovados'}`;
  els.pendingCount.textContent = `${pending} para revisar`;
  els.requirementsList.innerHTML = state.requirements.length ? state.requirements.map((item) => `<button class="requirement-list-item ${item.id === state.selectedRequirementId ? 'is-selected' : ''} is-${item.status}" type="button" data-requirement-id="${item.id}"><span class="requirement-list-item__top"><span class="requirement-list-item__id">${item.id} · v${item.version || 1}${item.comments?.length ? ` · ${item.comments.length} comentário${item.comments.length === 1 ? '' : 's'}` : ''}</span><span class="requirement-list-item__state"></span></span><strong>${escapeHtml(item.title || 'Novo requisito')}</strong><p>${escapeHtml(item.description || 'Ainda sem descrição')}</p></button>`).join('') : '<div class="session-empty"><strong>Nenhum rascunho</strong><p>Use o botão + para adicionar.</p></div>';
  const current = getSelectedRequirement();
  els.requirementEmpty.hidden = Boolean(current);
  els.requirementEditor.hidden = !current;
  if (!current) return;
  els.requirementId.textContent = current.id;
  els.requirementState.textContent = current.status === 'approved' ? 'Aprovado' : current.status === 'rejected' ? 'Rejeitado' : 'Para revisar';
  els.requirementState.className = `state-badge is-${current.status}`;
  const approveButton = document.querySelector('#approve-requirement');
  approveButton.disabled = current.status === 'approved';
  approveButton.textContent = current.status === 'approved' ? 'Aprovado ✓' : 'Aprovar requisito ✓';
  document.querySelector('#reject-requirement').disabled = current.status === 'rejected';
  const form = els.requirementForm.elements;
  ['title', 'description', 'type', 'priority', 'acceptanceCriteria', 'notes'].forEach((key) => { form[key].value = current[key] || ''; });
  renderUserOptions(current.responsavelTecnicoId);
  els.requirementSource.textContent = current.source?.text ? `“${truncate(current.source.text, 260)}”` : 'Requisito criado manualmente, sem evidência vinculada.';
  renderQuality(current);
  renderRequirementIntelligence(current);
}

function renderUserOptions(selectedId = '') {
  const select = els.requirementForm.elements.responsavelTecnicoId;
  select.innerHTML = ['<option value="">Definir depois</option>'].concat(usersDirectory.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`)).join('');
  select.value = selectedId || '';
}

function renderLiveQuality() {
  const current = getSelectedRequirement();
  if (!current) return;
  renderQuality({ ...current, ...requirementFromForm() });
}

function renderQuality(requirement) {
  const checks = qualityChecks(requirement);
  const score = checks.filter((check) => check.good).length;
  els.qualityScore.textContent = `${score}/${checks.length}`;
  els.qualityTitle.textContent = score === checks.length ? 'Pronto para aprovação' : score >= 3 ? 'Quase pronto' : 'Ainda precisa de revisão';
  els.qualityList.innerHTML = checks.map((check) => `<li class="${check.good ? 'is-good' : ''}">${check.label}</li>`).join('');
}

function qualityChecks(requirement) {
  const description = requirement.description || '';
  const criteria = requirement.acceptanceCriteria || '';
  const modalCount = (description.match(/\b(deve|devem|deverá|deverão|pode|podem|precisa|precisam|exige|exigem)\b/gi) || []).length;
  const comparable = normalizeForComparison(description);
  const hasDuplicate = Boolean(comparable) && state.requirements.some((item) => item.id !== requirement.id && normalizeForComparison(item.description) === comparable && item.status !== 'rejected');
  return [
    { label: 'Possui evidência de origem vinculada', good: Boolean(requirement.source?.text) },
    { label: 'Título curto e orientado a uma ação', good: requirement.title?.length >= 8 && requirement.title.length <= 100 },
    { label: 'Descreve um comportamento verificável', good: description.length >= 25 && /deve|devem|deverá|pode|podem|exige|exigem/i.test(description) },
    { label: 'Tem critérios com cenário, ação e resultado', good: /dado/i.test(criteria) && /quando/i.test(criteria) && /ent[aã]o/i.test(criteria) },
    { label: 'Trata uma responsabilidade por vez', good: modalCount <= 1 && !/e também|bem como|além de/i.test(description) },
    { label: 'Evita termos vagos ou subjetivos', good: !/rápid[oa]|fácil|adequad[oa]|eficiente|intuitiv[oa]|etc\.?/i.test(`${description} ${criteria}`) },
    { label: 'Não duplica outro requisito ativo', good: !hasDuplicate },
    { label: 'Registra prioridade para negociação', good: ['Must', 'Should', 'Could'].includes(requirement.priority) },
  ];
}

function renderRequirementIntelligence(requirement) {
  const linkedCard = findLinkedCard(requirement);
  const connections = [Boolean(requirement.source?.text), Boolean(requirement.id), Boolean(linkedCard || requirement.linkedCardId)].filter(Boolean).length;
  els.traceCoverage.textContent = `${connections}/3 conexões`;
  els.traceSource.textContent = requirement.source?.label || 'Não vinculada';
  els.traceRequirement.textContent = `${requirement.id} · v${requirement.version || 1}`;
  els.traceCard.textContent = linkedCard?.cardId || requirement.linkedCardId || 'Ainda não criado';

  const dependencies = Array.isArray(requirement.dependencies) ? requirement.dependencies : [];
  const available = state.requirements.filter((item) => item.id !== requirement.id && !dependencies.includes(item.id) && item.status !== 'rejected');
  els.dependencySelect.innerHTML = '<option value="">Selecionar requisito...</option>' + available.map((item) => `<option value="${item.id}">${item.id} — ${escapeHtml(item.title || 'Sem título')}</option>`).join('');
  els.dependencyList.innerHTML = dependencies.length ? dependencies.map((id) => {
    const item = state.requirements.find((candidate) => candidate.id === id);
    return `<span class="dependency-chip">${escapeHtml(id)}${item?.title ? ` · ${escapeHtml(truncate(item.title, 28))}` : ''}<button type="button" data-remove-dependency="${escapeHtml(id)}" aria-label="Remover dependência ${escapeHtml(id)}">×</button></span>`;
  }).join('') : '<span class="dependency-empty">Nenhuma dependência registrada.</span>';

  const history = Array.isArray(requirement.history) ? requirement.history : [];
  els.requirementVersion.textContent = `v${requirement.version || 1}`;
  els.requirementHistory.innerHTML = history.length ? history.slice(0, 8).map((item) => `<article class="history-item"><strong>v${item.version || 1} · ${escapeHtml(item.action)}</strong><p>${escapeHtml(item.actor?.name || 'Req.')} · <time datetime="${item.createdAt}">${formatRelativeDateTime(item.createdAt)}</time></p></article>`).join('') : '<p class="activity-empty">A primeira versão será registrada ao salvar.</p>';

  const comments = Array.isArray(requirement.comments) ? requirement.comments : [];
  els.commentCount.textContent = `${comments.length} ${comments.length === 1 ? 'comentário' : 'comentários'}`;
  els.requirementComments.innerHTML = comments.length ? comments.slice().reverse().slice(0, 8).map((comment) => `<article class="comment-item"><div class="comment-item__head"><strong>${escapeHtml(comment.author?.name || 'Usuário')}</strong><time datetime="${comment.createdAt}">${formatRelativeDateTime(comment.createdAt)}</time></div><p>${escapeHtml(comment.body)}</p></article>`).join('') : '<p class="activity-empty">Nenhuma discussão ainda. Registre decisões no contexto do requisito.</p>';
  els.commentInput.value = '';
  renderChangeImpactPreview();
}

function renderChangeImpactPreview() {
  const current = getSelectedRequirement();
  if (!current || els.requirementEditor.hidden) return;
  const changedWhileApproved = current.status === 'approved' && requirementSignature(current) !== requirementSignature({ ...current, ...requirementFromForm() });
  const needsReview = current.impactStatus === 'review-required' || changedWhileApproved;
  els.changeImpact.hidden = !needsReview;
  if (needsReview) {
    const cardReference = current.linkedCardId ? ` O card ${current.linkedCardId} também deverá ser conferido.` : '';
    els.changeImpactCopy.textContent = `O requisito já havia sido aprovado. A mudança cria uma nova versão e reabre a revisão.${cardReference}`;
  }
}

function addDependency() {
  const current = getSelectedRequirement();
  const dependencyId = els.dependencySelect.value;
  if (!current || !dependencyId || dependencyId === current.id) return;
  current.dependencies ||= [];
  if (current.dependencies.includes(dependencyId)) return;
  current.dependencies.push(dependencyId);
  markRequirementChanged(current, `Dependência ${dependencyId} vinculada`);
  persist();
  renderRequirements();
  showToast('Dependência vinculada ao requisito.');
}

function removeDependency(event) {
  const button = event.target.closest('[data-remove-dependency]');
  const current = getSelectedRequirement();
  if (!button || !current) return;
  const dependencyId = button.dataset.removeDependency;
  current.dependencies = (current.dependencies || []).filter((id) => id !== dependencyId);
  markRequirementChanged(current, `Dependência ${dependencyId} removida`);
  persist();
  renderRequirements();
}

function addRequirementComment() {
  const current = getSelectedRequirement();
  const body = els.commentInput.value.trim();
  if (!current || !body) return;
  current.comments ||= [];
  current.comments.push({ id: crypto.randomUUID(), body, author: actorSummary(), createdAt: new Date().toISOString() });
  recordActivity('comment-added', `comentou em ${current.id}: “${truncate(body, 72)}”`, { sessionId: state.id, requirementId: current.id });
  persist();
  renderRequirements();
  showToast('Comentário adicionado.');
}

function findLinkedCard(requirement) {
  const cards = safeJsonParse(localStorage.getItem(CARDS_KEY), []);
  if (!Array.isArray(cards)) return null;
  return cards.find((card) => card.sourceSessionId === state.id && card.sourceRequirementId === requirement.id) || null;
}

function saveCurrentRequirement() {
  const current = getSelectedRequirement();
  if (!current) return null;
  const before = requirementSignature(current);
  Object.assign(current, requirementFromForm());
  const user = usersDirectory.find((item) => item.id === current.responsavelTecnicoId);
  current.responsavelTecnico = user?.name || '';
  if (before !== requirementSignature(current)) markRequirementChanged(current, 'Conteúdo do requisito atualizado');
  persist();
  renderRequirements();
  return current;
}

function requirementFromForm() {
  const data = new FormData(els.requirementForm);
  return Object.fromEntries(['title', 'description', 'type', 'priority', 'acceptanceCriteria', 'responsavelTecnicoId', 'notes'].map((key) => [key, String(data.get(key) || '').trim()]));
}

function requirementSignature(requirement) {
  return JSON.stringify({
    title: requirement.title || '', description: requirement.description || '', type: requirement.type || '', priority: requirement.priority || '',
    acceptanceCriteria: requirement.acceptanceCriteria || '', responsavelTecnicoId: requirement.responsavelTecnicoId || '', notes: requirement.notes || '',
    dependencies: [...(requirement.dependencies || [])].sort(),
  });
}

function markRequirementChanged(requirement, action) {
  const wasApproved = requirement.status === 'approved';
  requirement.version = (Number(requirement.version) || 1) + 1;
  requirement.updatedAt = new Date().toISOString();
  if (wasApproved) {
    requirement.status = 'draft';
    requirement.impactStatus = 'review-required';
    requirement.approvedBy = null;
    requirement.approvedAt = null;
    action = `${action}; aprovação reaberta`;
  }
  appendRequirementHistory(requirement, action);
  recordActivity('requirement-changed', `alterou ${requirement.id} para v${requirement.version}${wasApproved ? ' e reabriu a aprovação' : ''}`, { sessionId: state.id, requirementId: requirement.id });
}

function initializeRequirementHistory(requirement, action = 'Versão inicial criada') {
  requirement.version = Number(requirement.version) || 1;
  requirement.history ||= [];
  if (!requirement.history.length) appendRequirementHistory(requirement, action);
}

function appendRequirementHistory(requirement, action) {
  requirement.history ||= [];
  requirement.history.unshift({
    id: crypto.randomUUID(), version: Number(requirement.version) || 1, action, actor: actorSummary(), createdAt: new Date().toISOString(),
    snapshot: { title: requirement.title || '', description: requirement.description || '', status: requirement.status || 'draft', priority: requirement.priority || 'Must' },
  });
  requirement.history = requirement.history.slice(0, 30);
}

function actorSummary() { return { id: currentUser.id || 'local', name: currentUser.name || 'Usuário local' }; }

function approveRequirement() {
  const current = saveCurrentRequirement();
  if (!current || !current.title || !current.description) { showToast('Adicione título e comportamento esperado antes de aprovar.'); return; }
  current.status = 'approved';
  current.impactStatus = 'clear';
  current.approvedBy = actorSummary();
  current.approvedAt = new Date().toISOString();
  appendRequirementHistory(current, 'Requisito aprovado');
  recordActivity('requirement-approved', `aprovou ${current.id} — ${current.title}`, { sessionId: state.id, requirementId: current.id });
  selectNextRequirement();
  persist();
  renderRequirements();
  showToast('Requisito aprovado.');
}

function rejectRequirement() {
  const current = saveCurrentRequirement();
  if (!current) return;
  current.status = 'rejected';
  current.approvedBy = null;
  current.approvedAt = null;
  appendRequirementHistory(current, 'Rascunho rejeitado');
  recordActivity('requirement-rejected', `rejeitou ${current.id} — ${current.title || 'Sem título'}`, { sessionId: state.id, requirementId: current.id });
  selectNextRequirement();
  persist();
  renderRequirements();
  showToast('Rascunho rejeitado.');
}

function deleteRequirement() {
  const current = getSelectedRequirement();
  if (!current) return;
  recordActivity('requirement-deleted', `descartou ${current.id} — ${current.title || 'Sem título'}`, { sessionId: state.id, requirementId: current.id });
  state.requirements = state.requirements.filter((item) => item.id !== current.id);
  state.selectedRequirementId = state.requirements[0]?.id || null;
  persist();
  renderRequirements();
}

function addRequirement() {
  const requirement = createEmptyRequirement();
  initializeRequirementHistory(requirement, 'Requisito criado manualmente');
  state.requirements.push(requirement);
  state.selectedRequirementId = requirement.id;
  recordActivity('requirement-created', `criou ${requirement.id} manualmente`, { sessionId: state.id, requirementId: requirement.id });
  persist();
  renderRequirements();
}

function selectNextRequirement() {
  state.selectedRequirementId = state.requirements.find((item) => item.status === 'draft')?.id || state.selectedRequirementId;
}

function returnToRequirementSource() {
  const current = getSelectedRequirement();
  const index = QUESTIONS.findIndex((question) => question.id === current?.source?.questionId);
  if (index < 0) { showToast('Este requisito veio de notas importadas.'); return; }
  state.currentQuestionIndex = index;
  goStep('interview');
}

function goToDelivery() {
  if (!state.requirements.some((item) => item.status === 'approved')) { showToast('Aprove pelo menos um requisito antes de preparar a entrega.'); return; }
  state.maxStep = Math.max(state.maxStep, 4);
  goStep('delivery', true);
}

function renderDelivery() {
  const approved = state.requirements.filter((item) => item.status === 'approved').length;
  const openQuestions = state.skipped.length;
  els.deliveryApproved.textContent = String(approved);
  els.deliveryQuestions.textContent = String(openQuestions);
  els.deliveryCards.textContent = String(state.cardsSent || 0);
  els.deliveryMessage.textContent = openQuestions ? `Existem ${openQuestions} perguntas em aberto. Você pode entregar agora ou voltar para completar o levantamento.` : 'O entendimento foi revisado e os requisitos aprovados estão prontos para o time.';
  document.querySelector('#send-to-cards').disabled = approved === 0;
}

function sendApprovedToCards() {
  const approved = state.requirements.filter((item) => item.status === 'approved');
  if (!approved.length) return;
  const storedCards = safeJsonParse(localStorage.getItem(CARDS_KEY), []);
  const cards = Array.isArray(storedCards) ? storedCards : [];
  let created = 0;
  approved.forEach((requirement) => {
    if (cards.some((card) => card.sourceSessionId === state.id && card.sourceRequirementId === requirement.id)) return;
    const card = requirementToCard(requirement);
    cards.push(card);
    requirement.linkedCardId = card.cardId;
    appendRequirementHistory(requirement, `Card ${card.cardId} criado`);
    recordActivity('card-created', `conectou ${requirement.id} ao card ${card.cardId}`, { sessionId: state.id, requirementId: requirement.id, cardId: card.cardId });
    created += 1;
  });
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  state.cardsSent = (state.cardsSent || 0) + created;
  persist();
  renderDelivery();
  showToast(`${created} ${created === 1 ? 'card criado' : 'cards criados'}. Abrindo a fila...`);
  setTimeout(() => { window.location.href = '../cards?from=requirements'; }, 700);
}

function requirementToCard(requirement) {
  return {
    localId: crypto.randomUUID(), cardId: `CRD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, discordMessageId: null,
    sourceSessionId: state.id, sourceRequirementId: requirement.id,
    tipo: requirement.type === 'Regra' ? 'Ajuste de regra' : 'Nova funcionalidade', prioridade: requirement.priority === 'Must' ? 'Alta' : requirement.priority === 'Should' ? 'Media' : 'Baixa',
    origemDemanda: [state.projectName, state.client].filter(Boolean).join(' · '), impacto: state.summaries.problem || state.primaryGoal,
    contexto: `${state.primaryGoal}\n\nOrigem: ${requirement.source?.text || 'Levantamento Req.'}`, comportamentoAtual: state.summaries.currentProcess || state.summaries.problem,
    comportamentoEsperado: requirement.description, regrasNegocio: state.summaries.rules, responsavelTecnicoId: requirement.responsavelTecnicoId || '', responsavelTecnico: requirement.responsavelTecnico || '',
    criteriosAceite: requirement.acceptanceCriteria.split('\n').map((line) => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean), observacao: requirement.notes || `Gerado pelo levantamento ${state.projectName}.`, evidenciasFotos: [], evidenciasVideos: [],
  };
}

function exportMarkdown() { downloadFile(`${safeFileName(state.projectName)}-requisitos.md`, buildMarkdown(), 'text/markdown;charset=utf-8'); }
function exportJson() { downloadFile(`${safeFileName(state.projectName)}-requisitos.json`, JSON.stringify(state, null, 2), 'application/json;charset=utf-8'); }

function buildMarkdown() {
  const lines = [`# ${state.projectName}`, '', `> ${state.primaryGoal}`, '', '## Entendimento confirmado', ''];
  FINDINGS.forEach((finding) => { lines.push(`### ${finding.label}`, state.summaries[finding.key] || 'Não informado', ''); });
  lines.push('## Requisitos aprovados', '');
  state.requirements.filter((item) => item.status === 'approved').forEach((item) => lines.push(
    `### ${item.id} — ${item.title}`, '', item.description, '',
    `- Versão: v${item.version || 1}`, `- Tipo: ${item.type}`, `- Prioridade: ${item.priority}`, `- Responsável: ${item.responsavelTecnico || 'Não definido'}`,
    `- Aprovado por: ${item.approvedBy?.name || 'Não registrado'}`, `- Dependências: ${(item.dependencies || []).join(', ') || 'Nenhuma'}`, `- Card: ${item.linkedCardId || 'Não criado'}`, '',
    '**Critérios de aceite**', item.acceptanceCriteria, '', `**Origem:** ${item.source?.text || 'Não vinculada'}`, '',
    `**Revisões registradas:** ${(item.comments || []).length}`, ''
  ));
  return lines.join('\n');
}

function finishSession() {
  state.status = 'completed';
  state.currentStep = 'delivery';
  recordActivity('session-completed', `concluiu o levantamento “${state.projectName || 'Sem nome'}”`, { sessionId: state.id });
  persist();
  showHome();
  showToast('Levantamento concluído e salvo.');
}

function createSession() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, status: 'setup', currentStep: 'setup', maxStep: 0, entryMode: 'guided', projectName: '', primaryGoal: '', stakeholder: '', client: '', facilitator: '', sessionDate: now.slice(0, 10), importNotes: '', rawNotes: '', currentQuestionIndex: 0, answers: {}, skipped: [], summaries: emptySummaries(), confirmedFindings: [], editingFinding: null, requirements: [], selectedRequirementId: null, cardsSent: 0 };
}

function createRequirementBase() {
  const now = new Date().toISOString();
  return { id: '', title: '', description: '', type: 'Funcional', priority: 'Must', acceptanceCriteria: '', notes: '', responsavelTecnicoId: '', responsavelTecnico: '', status: 'draft', source: null, dependencies: [], comments: [], history: [], version: 1, impactStatus: 'clear', linkedCardId: '', approvedBy: null, approvedAt: null, createdAt: now, updatedAt: now };
}

function createEmptyRequirement() {
  return { ...createRequirementBase(), id: nextRequirementId(), source: { questionId: null, label: 'Criação manual', text: '' } };
}

function nextRequirementId() {
  const max = state.requirements.reduce((highest, item) => Math.max(highest, Number.parseInt(item.id?.replace(/\D/g, ''), 10) || 0), 0);
  return `REQ-${String(max + 1).padStart(3, '0')}`;
}

function getSelectedRequirement() { return state.requirements.find((item) => item.id === state.selectedRequirementId) || null; }
function emptySummaries() { return { objective: '', currentProcess: '', problem: '', actors: '', rules: '', behaviors: '', exceptions: '', successCriteria: '', questions: '' }; }

function loadWorkspace() {
  const stored = safeJsonParse(localStorage.getItem(WORKSPACE_KEY), null);
  if (stored?.sessions) {
    stored.activity ||= [];
    stored.sessions.forEach(hydrateSession);
    return stored;
  }
  const migrated = migrateLegacy();
  return { revision: 0, activeSessionId: null, sessions: migrated ? [migrated] : [], activity: [] };
}

async function loadCloudWorkspace() {
  try {
    const response = await fetch('/api/workspace', { credentials: 'include' });
    if (!response.ok) throw new Error('Workspace cloud unavailable');
    const payload = await response.json();
    const remote = payload.workspace || { revision: 0, sessions: [], activity: [] };
    workspace = mergeWorkspaces(workspace, remote);
    workspace.revision = Number(remote.revision) || 0;
    cloudAvailable = true;
    persistWorkspace(false);
  } catch {
    cloudAvailable = false;
    workspace.activity ||= [];
  }
}

function mergeWorkspaces(local, remote) {
  const remoteSessions = new Map((remote.sessions || []).map((session) => [session.id, session]));
  let needsCloudMigration = false;
  (local.sessions || []).forEach((session) => {
    const remoteSession = remoteSessions.get(session.id);
    if (!remoteSession || new Date(session.updatedAt || 0) > new Date(remoteSession.updatedAt || 0)) {
      remoteSessions.set(session.id, session);
      needsCloudMigration = true;
    }
  });
  const sessions = [...remoteSessions.values()];
  sessions.forEach(hydrateSession);
  const activityMap = new Map();
  [...(remote.activity || []), ...(local.activity || [])].forEach((item) => activityMap.set(item.id || `${item.createdAt}:${item.message}`, item));
  return {
    revision: Number(remote.revision) || 0,
    activeSessionId: local.activeSessionId || remote.activeSessionId || null,
    sessions,
    activity: [...activityMap.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 300),
    needsCloudMigration,
  };
}

function migrateLegacy() {
  const legacy = safeJsonParse(localStorage.getItem(LEGACY_KEY), null);
  if (!legacy || (!legacy.rawNotes && !legacy.session?.primaryGoal && !legacy.requirements?.length)) return null;
  const session = createSession();
  Object.assign(session, legacy.session || {});
  session.stakeholder = legacy.session?.client || '';
  session.importNotes = legacy.rawNotes || '';
  session.rawNotes = legacy.rawNotes || '';
  session.entryMode = 'import';
  session.summaries = { ...emptySummaries(), ...(legacy.summaries || {}), currentProcess: legacy.summaries?.problem || '' };
  session.requirements = (legacy.requirements || []).map((item) => ({ ...createRequirementBase(), ...item, status: 'draft', source: { questionId: null, label: 'Sessão anterior', text: legacy.rawNotes || legacy.session?.primaryGoal || '' } }));
  session.currentStep = session.requirements.length ? 'requirements' : 'synthesis';
  session.status = session.currentStep;
  session.maxStep = session.requirements.length ? 3 : 2;
  session.selectedRequirementId = session.requirements[0]?.id || null;
  return session;
}

function hydrateSession(session) {
  session.answers ||= {};
  session.skipped ||= [];
  session.summaries = { ...emptySummaries(), ...(session.summaries || {}) };
  session.confirmedFindings ||= [];
  session.requirements = (session.requirements || []).map((item) => {
    const requirement = { ...createRequirementBase(), ...item, status: item.status || 'draft', dependencies: item.dependencies || [], comments: item.comments || [], history: item.history || [], version: Number(item.version) || 1, impactStatus: item.impactStatus || 'clear' };
    initializeRequirementHistory(requirement, 'Versão importada para o histórico');
    return requirement;
  });
  session.maxStep = Number.isFinite(session.maxStep) ? session.maxStep : STEP_ORDER.indexOf(session.currentStep || 'setup');
  session.currentQuestionIndex ||= 0;
  session.cardsSent ||= 0;
}

function persist() {
  if (!state) return persistWorkspace();
  state.updatedAt = new Date().toISOString();
  const index = workspace.sessions.findIndex((session) => session.id === state.id);
  if (index >= 0) workspace.sessions[index] = state;
  else workspace.sessions.unshift(state);
  workspace.activeSessionId = state.id;
  persistWorkspace();
  flashSaveState();
}

function persistWorkspace(syncCloud = true) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  if (syncCloud && cloudAvailable) scheduleCloudPersist();
}
function schedulePersist() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 280); }
function scheduleCloudPersist(delay = 700) { clearTimeout(cloudSaveTimer); cloudSaveTimer = setTimeout(saveCloudWorkspace, delay); }

async function saveCloudWorkspace() {
  if (!cloudAvailable || cloudSaveInFlight) { if (cloudAvailable) scheduleCloudPersist(900); return; }
  cloudSaveInFlight = true;
  setSaveState('saving');
  try {
    const response = await fetch('/api/workspace', {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision: Number(workspace.revision) || 0, workspace: { activeSessionId: workspace.activeSessionId, sessions: workspace.sessions, activity: workspace.activity || [] } }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 409 && payload.workspace) {
      workspace = mergeWorkspaces(workspace, payload.workspace);
      workspace.revision = Number(payload.workspace.revision) || 0;
      persistWorkspace(false);
      cloudSaveInFlight = false;
      scheduleCloudPersist(100);
      return;
    }
    if (!response.ok) throw new Error(payload.error || 'Cloud save failed');
    workspace.revision = Number(payload.workspace?.revision) || workspace.revision;
    workspace.needsCloudMigration = false;
    persistWorkspace(false);
    setSaveState('saved');
  } catch {
    cloudAvailable = false;
    setSaveState('local');
    if (!els.homeView.hidden) renderIntelligenceOverview();
  } finally {
    cloudSaveInFlight = false;
  }
}

function setSaveState(status) {
  els.autosave.hidden = false;
  els.autosave.classList.toggle('is-saving', status === 'saving');
  els.autosave.classList.toggle('is-local', status === 'local');
  els.autosave.innerHTML = `<span></span>${status === 'saving' ? 'Sincronizando' : status === 'local' ? 'Salvo neste dispositivo' : 'Salvo no workspace'}`;
}

function flashSaveState() { setSaveState(cloudAvailable ? 'saved' : 'local'); }

function recordActivity(type, message, context = {}) {
  workspace.activity ||= [];
  workspace.activity.unshift({ id: crypto.randomUUID(), type, message, actor: actorSummary(), createdAt: new Date().toISOString(), ...context });
  workspace.activity = workspace.activity.slice(0, 300);
}

function updateWorkspaceHeader() {
  if (!state) return;
  els.workspaceTitle.textContent = state.projectName || 'Novo levantamento';
  els.workspaceDescription.textContent = state.primaryGoal || 'Prepare o contexto para conduzir uma conversa objetiva.';
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 2800);
}

function splitIdeas(value = '') { return String(value).split(/\n+|(?<=[.!?])\s+|;+/).map(sanitizeLine).filter((line) => line.length > 8); }
function sanitizeLine(value = '') { return String(value).replace(/^[-*•\d.)\s]+/, '').replace(/\s+/g, ' ').trim(); }
function dedupe(values) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function normalizeForComparison(value = '') { return String(value).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function firstSentence(value = '') { return splitIdeas(value)[0] || String(value).trim(); }
function deriveTitle(value, type) {
  const clean = value
    .replace(/^o sistema deve\s+/i, '')
    .replace(/^(?:o|a|os|as)\s+.+?\s+(?:só\s+)?(?:deve|devem|pode|podem|precisa|precisam)\s+/i, '')
    .replace(/^deve\s+/i, '');
  const words = clean.split(/\s+/).slice(0, 9).join(' ').replace(/\s+(?:e|ou|de|da|do|para|com)$/i, '');
  return type === 'Regra' ? `Aplicar regra: ${capitalize(words)}` : capitalize(words);
}
function ensurePeriod(value = '') { const text = value.trim(); return /[.!?]$/.test(text) ? text : `${text}.`; }
function capitalize(value = '') { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }
function lowercaseFirst(value = '') { return value ? value.charAt(0).toLowerCase() + value.slice(1) : ''; }
function truncate(value = '', max = 200) { const text = String(value).replace(/\s+/g, ' ').trim(); return text.length > max ? `${text.slice(0, max - 1)}…` : text; }
function formatRelativeDate(value) { const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000); return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`; }
function formatRelativeDateTime(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return formatRelativeDate(value);
}
function initials(value = '') { return String(value).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'R'; }
function safeFileName(value = 'levantamento') { return String(value || 'levantamento').normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }
function safeJsonParse(value, fallback) { try { const parsed = JSON.parse(value); return parsed ?? fallback; } catch { return fallback; } }
function escapeHtml(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function downloadFile(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
