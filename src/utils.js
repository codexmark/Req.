// Utility functions
export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

export function normalizeKey(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function lowercaseFirst(text) {
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function ensurePeriod(text) {
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function splitLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function dedupeLines(lines) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}

export function firstMeaningfulLine(lines) {
  return lines.find((line) => line.length > 16) || "";
}

export function firstSentence(text) {
  return text.split(/[.!?]/).map((item) => item.trim()).find(Boolean) || "";
}

export function normalizeSentence(text) {
  return text.replace(/\s+/g, " ").trim();
}

export function sanitizeRequirementLine(text) {
  return normalizeSentence(String(text || "").replace(/^[-*]\s*/, ""));
}

export function isNarrativeLine(line) {
  return /^(o rh comentou|na pratica|isso acaba|hoje |atualmente |o usuario comentou|foi informado|o time comentou)/i.test(
    sanitizeRequirementLine(line)
  );
}

export function isPendingLine(line) {
  return /^(confirmar|validar|verificar|alinhar|entender)\b/i.test(sanitizeRequirementLine(line));
}

export function isRiskLine(line) {
  return /(exce|risco|inconsisten|falha|erro|retroativ|cenario)/i.test(sanitizeRequirementLine(line));
}

export function isRequirementCandidate(line) {
  const cleanLine = sanitizeRequirementLine(line);
  if (!cleanLine || cleanLine.length < 18) return false;
  if (isNarrativeLine(cleanLine)) return false;
  if (/^\[pergunta sugerida\]/i.test(cleanLine)) return false;
  return /(deve|deveria|precisa|listar|exibir|permitir|calcular|ordenar|paginar|abrir|preencher|bloquear|gerar)/i.test(
    cleanLine
  );
}

export function uniqueRequirementLines(lines) {
  const unique = [];
  const seen = new Set();

  lines.forEach((line) => {
    const cleanLine = sanitizeRequirementLine(line);
    if (!isRequirementCandidate(cleanLine) || isPendingLine(cleanLine)) return;

    const canonical = canonicalizeRequirementMeaning(cleanLine);
    if (seen.has(canonical)) return;
    seen.add(canonical);
    unique.push(cleanLine);
  });

  return unique;
}

export function canonicalizeRequirementMeaning(line) {
  return normalizeKey(
    sanitizeRequirementLine(line)
      .replace(/^o sistema deve obedecer a regra de negocio:\s*/i, "")
      .replace(/^o sistema deve\s*/i, "")
      .replace(/^deve\s*/i, "")
      .replace(/^o modal deveria\s*/i, "")
      .replace(/^o modal deve\s*/i, "modal ")
      .replace(/^ao clicar em adicionar,\s*/i, "clicar adicionar ")
      .replace(/\bja\b/gi, "")
      .replace(/[.,]/g, "")
  );
}

export function toAcceptanceSentence(line) {
  const cleanLine = sanitizeRequirementLine(line)
    .replace(/^o sistema deve obedecer a regra de negocio:\s*/i, "")
    .replace(/^o sistema deve\s*/i, "")
    .replace(/^deve\s*/i, "");
  return ensurePeriod(capitalize(cleanLine));
}