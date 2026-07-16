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

export function removeLineNumbers(text) {
  if (!text) return '';

  const lines = text.split('\n');
  let allNumbered = true;
  const cleanedLines = lines.map(line => {
    if (/^\s*$/.test(line)) {
      return line; // blank line unchanged
    }

    // Check if it's a bare-number line (preserve a trailing \r so CRLF text stays consistent)
    if (/^\s*\d+\s*$/.test(line)) {
      return line.endsWith('\r') ? '\r' : '';
    }

    // Check if it's a numbered content line
    const match = line.match(/^\s*(\d+)(\s*[:|.)]\s?|\t)/);
    if (match) {
      const prefixLength = match[0].length;
      return line.slice(prefixLength);
    }

    // Not a numbered line
    allNumbered = false;
    return line;
  });

  // If any line was unnumbered, return original text
  if (!allNumbered) {
    return text;
  }

  return cleanedLines.join('\n');
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

const HTML_ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  sbquo: '‚',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  bull: '•',
  hellip: '…',
  middot: '·',
  prime: '′',
  Prime: '″',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  cent: '¢',
  deg: '°',
  sect: '§',
  para: '¶',
  micro: 'µ',
  times: '×',
  divide: '÷',
  plusmn: '±',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  zwj: '\u200D',
  zwnj: '\u200C',
};

function decodeHtmlEntity(match, named, decimal, hex) {
  if (named) return HTML_ENTITY_MAP[named] ?? match;

  const codePoint = Number.parseInt(decimal ?? hex, decimal ? 10 : 16);
  if (!Number.isFinite(codePoint)) return match;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return match;
  }
}

export function extractFromHTML(text) {
  if (!text) return '';
  return text
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|blockquote|section|article|ul|ol|table|thead|tbody|tfoot|pre)>/gi, '\n')
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/&([A-Za-z][A-Za-z0-9]+);|&#(\d+);|&#x([0-9a-fA-F]+);/g, decodeHtmlEntity)
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+|\n+$/g, '');
}

// ── Paragraph / Paste Cleaners ──

export function unwrapParagraphs(text) {
  if (!text) return '';
  const normalized = text.replace(/\r\n/g, '\n');
  // Split on paragraph breaks (2+ newlines), unwrap single newlines within each
  return normalized
    .replace(/\n{3,}/g, '\n\n')
    .split(/\n\n/)
    .map(para => para.replace(/\n/g, ' '))
    .join('\n\n');
}

export function cleanCodePaste(text) {
  if (!text) return '';
  let result = stripLeadingIndentation(text);
  result = trimWhitespace(result);
  result = unwrapParagraphs(result);
  result = removeExtraSpaces(result);
  return result;
}

// ── Character Cleaners ──

const EMOJI_REGEX_BASE = String.raw`\p{Emoji}(?:\p{EMod}|[\u{E0020}-\u{E007E}]+\u{E007F}|\uFE0F?\u20E3?)`;
const EMOJI_REGEX = new RegExp(
  String.raw`\p{RI}{2}|(?![#*\d](?!\uFE0F?\u20E3))${EMOJI_REGEX_BASE}(?:\u200D${EMOJI_REGEX_BASE})*`,
  'gu'
);

export function stripEmojis(text) {
  if (!text) return '';
  return text.replace(EMOJI_REGEX, '');
}

export function removeNonASCII(text) {
  if (!text) return '';
  return text.replace(/[^\x00-\x7F]/g, '');
}

export function normalizeUnicode(text) {
  if (!text) return '';
  return text
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/\u2014/g, '--')
    .replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2000-\u200A\u2003\u202F\u205F\u3000]/g, ' ')
    .replace(/[\uFB01]/g, 'fi')
    .replace(/[\uFB02]/g, 'fl');
}

// ── Privacy / Redaction Cleaners ──

export function stripEmails(text) {
  if (!text) return '';
  return text.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
}

function stripUrlMatch(match) {
  const trailing = match.match(/[.,;:!?)]$/);
  return trailing ? trailing[0] : '';
}

export function stripURLs(text) {
  if (!text) return '';
  return text.replace(/https?:\/\/[^\s]+/g, stripUrlMatch)
    .replace(/www\.[^\s]+/g, stripUrlMatch);
}

// ── Line Cleaners ──

export function removeBlankLines(text) {
  if (!text) return '';
  return text.split('\n').filter(line => line.trim().length > 0).join('\n');
}

// ── Writing Cleaners ──

export function fixPunctuationSpacing(text) {
  if (!text) return '';
  // Add space after punctuation when followed by a non-space, non-newline, non-digit character
  // But not when the punctuation is between digits (e.g. 1.5, 3,000)
  return text
    .replace(/([.!?,;:])([^\s\d\n"'’”)\]\}])/g, '$1 $2')
    .replace(/([.!?,;:][)"'’”\]\}])([^\s\d\n])/g, '$1 $2');
}

// ── Registry ──

export const cleaners = [
  // Paste cleanup (most common workflows first)
  { id: 'clean-code-paste', name: 'Clean Code Paste', fn: cleanCodePaste, category: 'whitespace' },
  { id: 'unwrap-paragraphs', name: 'Unwrap Paragraphs', fn: unwrapParagraphs, category: 'whitespace' },
  { id: 'normalize-unicode', name: 'Normalize Unicode', fn: normalizeUnicode, category: 'characters' },
  // Whitespace
  { id: 'remove-extra-spaces', name: 'Remove Extra Spaces', fn: removeExtraSpaces, category: 'whitespace' },
  { id: 'remove-extra-returns', name: 'Remove Extra Returns', fn: removeExtraReturns, category: 'whitespace' },
  { id: 'remove-blank-lines', name: 'Remove Blank Lines', fn: removeBlankLines, category: 'lines' },
  { id: 'trim-whitespace', name: 'Trim Whitespace', fn: trimWhitespace, category: 'whitespace' },
  { id: 'strip-leading-indentation', name: 'Strip Leading Indentation', fn: stripLeadingIndentation, category: 'whitespace' },
  { id: 'remove-all-tabs', name: 'Remove All Tabs', fn: removeAllTabs, category: 'whitespace' },
  { id: 'rewrap-text', name: 'Rewrap Text', fn: rewrapText, category: 'whitespace' },
  { id: 'remove-forwarding-chars', name: 'Remove Forwarding Characters', fn: removeForwardingCharacters, category: 'whitespace' },
  { id: 'remove-line-numbers', name: 'Remove Line Numbers', fn: removeLineNumbers, category: 'lines' },
  // Quotes & characters
  { id: 'straighten-quotes', name: 'Straighten Quotes', fn: straightenQuotes, category: 'quotes' },
  { id: 'smarten-quotes', name: 'Smarten Quotes', fn: smartenQuotes, category: 'quotes' },
  { id: 'strip-emojis', name: 'Strip Emojis', fn: stripEmojis, category: 'characters' },
  { id: 'remove-non-ascii', name: 'Remove Non-ASCII', fn: removeNonASCII, category: 'characters' },
  // Case transforms
  { id: 'uppercase', name: 'UPPERCASE', fn: toUpperCase, category: 'transform' },
  { id: 'lowercase', name: 'lowercase', fn: toLowerCase, category: 'transform' },
  { id: 'title-case', name: 'Title Case', fn: toTitleCase, category: 'transform' },
  { id: 'sentence-case', name: 'Sentence Case', fn: toSentenceCase, category: 'transform' },
  // Privacy & redaction
  { id: 'strip-emails', name: 'Strip Emails', fn: stripEmails, category: 'privacy' },
  { id: 'strip-urls', name: 'Strip URLs', fn: stripURLs, category: 'privacy' },
  // Lines & structure
  { id: 'sort-lines', name: 'Sort Lines', fn: sortLines, category: 'lines' },
  { id: 'remove-duplicate-lines', name: 'Remove Duplicate Lines', fn: removeDuplicateLines, category: 'lines' },
  { id: 'extract-from-html', name: 'Extract from HTML', fn: extractFromHTML, category: 'transform' },
  // Writing
  { id: 'fix-punctuation-spacing', name: 'Fix Punctuation Spacing', fn: fixPunctuationSpacing, category: 'writing' },
];
