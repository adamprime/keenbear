// ── Core Cleaners ──

export function removeExtraSpaces(text) {
  if (!text) return '';
  return text.split('\n').map(line => line.replace(/ {2,}/g, ' ').trimEnd()).join('\n');
}

export function removeExtraReturns(text) {
  if (!text) return '';
  // Handle Windows-style line endings
  return text.replace(/(\r?\n){3,}/g, (match) => {
    const eol = match.includes('\r\n') ? '\r\n' : '\n';
    return eol + eol;
  });
}

export function stripLeadingIndentation(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);
  if (nonEmptyLines.length === 0) return text;

  const minIndent = Math.min(
    ...nonEmptyLines.map(l => {
      const match = l.match(/^(\s*)/);
      return match ? match[1].length : 0;
    })
  );

  if (minIndent === 0) return text;
  return lines.map(l => l.length > 0 ? l.slice(minIndent) : l).join('\n');
}

export function removeAllTabs(text, options = {}) {
  if (!text) return '';
  const spaces = ' '.repeat(options.spaces ?? 2);
  return text.replace(/\t/g, spaces);
}

export function trimWhitespace(text) {
  if (!text) return '';
  return text.split('\n').map(line => line.trim()).join('\n');
}

export function rewrapText(text, options = {}) {
  if (!text) return '';
  const width = options.width ?? 80;
  const paragraphs = text.split(/\n{2,}/);

  return paragraphs.map(para => {
    const words = para.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';

    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= width) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }).join('\n\n');
}

// ── Additional Cleaners ──

export function removeForwardingCharacters(text) {
  if (!text) return '';
  return text.split('\n').map(line => line.replace(/^>\s?/, '')).join('\n');
}

export function toUpperCase(text) {
  return text.toUpperCase();
}

export function toLowerCase(text) {
  return text.toLowerCase();
}

const TITLE_CASE_SKIP = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'it',
]);

export function toTitleCase(text) {
  if (!text) return '';
  return text.replace(/\S+/g, (word, offset) => {
    if (offset > 0 && TITLE_CASE_SKIP.has(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

export function toSentenceCase(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/(^|[.!?]\s+)(\w)/g, (_, boundary, char) => boundary + char.toUpperCase());
}

export function straightenQuotes(text) {
  if (!text) return '';
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

export function smartenQuotes(text) {
  if (!text) return '';
  return text
    .replace(/"([^"]*)"/g, '\u201C$1\u201D')
    .replace(/'([^']*)'/g, '\u2018$1\u2019');
}

export function sortLines(text, options = {}) {
  if (!text) return '';
  const lines = text.split('\n');
  lines.sort((a, b) => a.localeCompare(b));
  if (options.descending) lines.reverse();
  return lines.join('\n');
}

export function removeDuplicateLines(text) {
  if (!text) return '';
  const seen = new Set();
  return text.split('\n').filter(line => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  }).join('\n');
}

export function extractFromHTML(text) {
  if (!text) return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  const textarea = document.createElement('textarea');
  textarea.innerHTML = stripped;
  return textarea.value;
}

// ── Registry ──

export const cleaners = [
  { id: 'remove-extra-spaces', name: 'Remove Extra Spaces', fn: removeExtraSpaces, category: 'whitespace' },
  { id: 'remove-extra-returns', name: 'Remove Extra Returns', fn: removeExtraReturns, category: 'whitespace' },
  { id: 'strip-leading-indentation', name: 'Strip Leading Indentation', fn: stripLeadingIndentation, category: 'whitespace' },
  { id: 'remove-all-tabs', name: 'Remove All Tabs', fn: removeAllTabs, category: 'whitespace' },
  { id: 'trim-whitespace', name: 'Trim Whitespace', fn: trimWhitespace, category: 'whitespace' },
  { id: 'rewrap-text', name: 'Rewrap Text', fn: rewrapText, category: 'whitespace' },
  { id: 'remove-forwarding-chars', name: 'Remove Forwarding Characters', fn: removeForwardingCharacters, category: 'whitespace' },
  { id: 'uppercase', name: 'UPPERCASE', fn: toUpperCase, category: 'transform' },
  { id: 'lowercase', name: 'lowercase', fn: toLowerCase, category: 'transform' },
  { id: 'title-case', name: 'Title Case', fn: toTitleCase, category: 'transform' },
  { id: 'sentence-case', name: 'Sentence Case', fn: toSentenceCase, category: 'transform' },
  { id: 'straighten-quotes', name: 'Straighten Quotes', fn: straightenQuotes, category: 'quotes' },
  { id: 'smarten-quotes', name: 'Smarten Quotes', fn: smartenQuotes, category: 'quotes' },
  { id: 'sort-lines', name: 'Sort Lines', fn: sortLines, category: 'lines' },
  { id: 'remove-duplicate-lines', name: 'Remove Duplicate Lines', fn: removeDuplicateLines, category: 'lines' },
  { id: 'extract-from-html', name: 'Extract from HTML', fn: extractFromHTML, category: 'transform' },
];
