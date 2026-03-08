const MAX_PATTERN_LENGTH = 500;

export function compilePattern(pattern, { regex = false, caseSensitive = true } = {}) {
  if (!pattern) return null;
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error('Pattern too long (max 500 characters)');
  }

  try {
    const flags = 'g' + (caseSensitive ? '' : 'i');
    if (regex) {
      return new RegExp(pattern, flags);
    }
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  } catch (e) {
    throw new Error(`Invalid pattern: ${e.message}`);
  }
}

export function countMatches(text, pattern, options = {}) {
  if (!text || !pattern) return 0;
  const re = compilePattern(pattern, options);
  if (!re) return 0;
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

export function replaceAll(text, pattern, replacement, options = {}) {
  if (!text || !pattern) return text;
  const re = compilePattern(pattern, options);
  if (!re) return text;

  // Guard against empty-match regex causing infinite loops
  if (re.test('') && replacement !== '') {
    re.lastIndex = 0;
  }

  return text.replace(re, replacement);
}
