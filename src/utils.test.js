import { describe, test, expect } from 'vitest';
import { escapeHtml, truncate, normalizeKey, capitalize, lowercaseFirst, ensurePeriod, splitLines, dedupeLines, firstMeaningfulLine, firstSentence, normalizeSentence, sanitizeRequirementLine, isNarrativeLine, isPendingLine, isRiskLine, isRequirementCandidate, uniqueRequirementLines, canonicalizeRequirementMeaning, toAcceptanceSentence } from './utils.js';

describe('Utility Functions', () => {
  test('escapeHtml escapes HTML characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('truncate cuts string to max length', () => {
    expect(truncate('Hello world', 5)).toBe('Hell...');
    expect(truncate('Hi', 10)).toBe('Hi');
    expect(truncate('', 5)).toBe('');
  });

  test('normalizeKey removes accents and lowercases', () => {
    expect(normalizeKey('ÇÃO')).toBe('cao');
    expect(normalizeKey('Hello World')).toBe('hello world');
    expect(normalizeKey('  spaces  ')).toBe('spaces');
  });

  test('capitalize capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('')).toBe('');
    expect(capitalize('hELLO')).toBe('HELLO');
  });

  test('lowercaseFirst lowercases first letter', () => {
    expect(lowercaseFirst('Hello')).toBe('hello');
    expect(lowercaseFirst('')).toBe('');
    expect(lowercaseFirst('hELLO')).toBe('hELLO'); // Only first char changed to lowercase
  });

  test('ensurePeriod adds period if missing', () => {
    expect(ensurePeriod('Hello')).toBe('Hello.');
    expect(ensurePeriod('Hello.')).toBe('Hello.');
    expect(ensurePeriod('')).toBe('');
  });

  test('splitLines splits by newline and removes empty lines', () => {
    expect(splitLines('line1\nline2\n\nline3')).toEqual(['line1', 'line2', 'line3']);
    expect(splitLines('')).toEqual([]);
    expect(splitLines('single line')).toEqual(['single line']);
  });

  test('dedupeLines removes duplicate lines', () => {
    expect(dedupeLines(['line1', 'line2', 'line1'])).toEqual(['line1', 'line2']);
    expect(dedupeLines([])).toEqual([]);
    expect(dedupeLines(['  line1  ', 'line1', ' line1 '])).toEqual(['line1']);
  });

  test('firstMeaningfulLine returns first line with length > 16', () => {
    expect(firstMeaningfulLine(['short', 'this is a longer line', 'another'])).toBe('this is a longer line');
    expect(firstMeaningfulLine(['a', 'b', 'c'])).toBe('');
  });

  test('firstSentence returns first sentence', () => {
    expect(firstSentence('Hello world. How are you?')).toBe('Hello world');
    expect(firstSentence('No punctuation')).toBe('No punctuation');
    expect(firstSentence('')).toBe('');
  });

  test('normalizeSentence normalizes whitespace', () => {
    expect(normalizeSentence('  hello   world  ')).toBe('hello world');
    expect(normalizeSentence('\thello\nworld')).toBe('hello world');
  });

  test('sanitizeRequirementLine removes list markers and normalizes', () => {
    expect(sanitizeRequirementLine('- item')).toBe('item');
    expect(sanitizeRequirementLine('* item')).toBe('item');
    expect(sanitizeRequirementLine('  item  ')).toBe('item');
    expect(sanitizeRequirementLine('')).toBe('');
  });

  test('isNarrativeLine identifies narrative lines', () => {
    expect(isNarrativeLine('o rh comentou que')).toBe(true);
    expect(isNarrativeLine('na pratica isso acaba')).toBe(true);
    expect(isNarrativeLine('o usuario comentou')).toBe(true);
    expect(isNarrativeLine('deve ser funcional')).toBe(false);
  });

  test('isPendingLine identifies pending lines', () => {
    expect(isPendingLine('confirmar isso')).toBe(true);
    expect(isPendingLine('validar com o usuario')).toBe(true);
    expect(isPendingLine('deve ser funcional')).toBe(false);
  });

  test('isRiskLine identifies risk lines', () => {
    expect(isRiskLine('excecao de seguranca')).toBe(true);
    expect(isRiskLine('risco de falha')).toBe(true);
    expect(isRiskLine('deve ser funcional')).toBe(false);
  });

  test('isRequirementCandidate identifies requirement lines', () => {
    expect(isRequirementCandidate('o sistema deve listar')).toBe(true);
    expect(isRequirementCandidate('deveria calcular o valor')).toBe(true);
    expect(isRequirementCandidate('precisa exibir o relatorio')).toBe(true);
    expect(isRequirementCandidate('o rh comentou')).toBe(false);
    expect(isRequirementCandidate('[pergunta sugerida] algo')).toBe(false);
    expect(isRequirementCandidate('curto')).toBe(false); // less than 18 chars
  });

  test('uniqueRequirementLines filters non-candidates and pending lines', () => {
    const lines = [
      'o sistema deve listar',
      'confirmar com o usuario', // pending
      'o sistema deve listar', // duplicate
      'o sistema deve calcular',
      'o rh comentou', // narrative
      '[pergunta sugerida] algo',
      'curto'
    ];
    expect(uniqueRequirementLines(lines)).toEqual(['o sistema deve listar', 'o sistema deve calcular']);
  });

  test('canonicalizeRequirementMeaning normalizes requirement meaning', () => {
    expect(canonicalizeRequirementMeaning('o sistema deve listar'))
      .toBe('listar');
    expect(canonicalizeRequirementMeaning('o sistema deve obedecer a regra de negocio: nao permitir'))
      .toBe('nao permitir');
    expect(canonicalizeRequirementMeaning('deve calcular'))
      .toBe('calcular');
  });

  test('toAcceptanceSentence converts line to acceptance sentence', () => {
    expect(toAcceptanceSentence('o sistema deve listar'))
      .toBe('Listar.');
    expect(toAcceptanceSentence('deve calcular'))
      .toBe('Calcular.');
    expect(toAcceptanceSentence('o sistema deve obedecer a regra de negocio: nao permitir'))
      .toBe('Nao permitir.');
  });
});