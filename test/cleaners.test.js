import {
  removeExtraSpaces,
  removeExtraReturns,
  stripLeadingIndentation,
  removeAllTabs,
  trimWhitespace,
  rewrapText,
  removeForwardingCharacters,
  toUpperCase,
  toLowerCase,
  toTitleCase,
  toSentenceCase,
  straightenQuotes,
  smartenQuotes,
  sortLines,
  removeDuplicateLines,
  extractFromHTML,
  unwrapParagraphs,
  cleanCodePaste,
  stripEmojis,
  removeNonASCII,
  normalizeUnicode,
  stripEmails,
  stripURLs,
  removeBlankLines,
  fixPunctuationSpacing,
} from '../js/cleaners.js';

// ── removeExtraSpaces ──

describe('removeExtraSpaces', () => {
  it('collapses multiple spaces to single', () => {
    assert.equal(removeExtraSpaces('hello   world'), 'hello world');
  });

  it('trims trailing spaces per line', () => {
    assert.equal(removeExtraSpaces('hello   \nworld  '), 'hello\nworld');
  });

  it('handles empty string', () => {
    assert.equal(removeExtraSpaces(''), '');
  });

  it('handles single line no extra spaces', () => {
    assert.equal(removeExtraSpaces('hello world'), 'hello world');
  });

  it('preserves single spaces', () => {
    assert.equal(removeExtraSpaces('a b c'), 'a b c');
  });

  it('handles tabs separately (not collapsed)', () => {
    assert.equal(removeExtraSpaces('a\tb'), 'a\tb');
  });
});

// ── removeExtraReturns ──

describe('removeExtraReturns', () => {
  it('collapses 3+ newlines to 2', () => {
    assert.equal(removeExtraReturns('a\n\n\nb'), 'a\n\nb');
  });

  it('preserves double newlines (paragraph breaks)', () => {
    assert.equal(removeExtraReturns('a\n\nb'), 'a\n\nb');
  });

  it('collapses 5+ newlines to 2', () => {
    assert.equal(removeExtraReturns('a\n\n\n\n\nb'), 'a\n\nb');
  });

  it('handles empty string', () => {
    assert.equal(removeExtraReturns(''), '');
  });

  it('handles single line', () => {
    assert.equal(removeExtraReturns('hello'), 'hello');
  });

  it('handles Windows-style line endings', () => {
    assert.equal(removeExtraReturns('a\r\n\r\n\r\nb'), 'a\r\n\r\nb');
  });
});

// ── stripLeadingIndentation ──

describe('stripLeadingIndentation', () => {
  it('removes common indent from all lines', () => {
    const input = '  hello\n  world';
    assert.equal(stripLeadingIndentation(input), 'hello\nworld');
  });

  it('removes smallest common indent', () => {
    const input = '    hello\n  world';
    assert.equal(stripLeadingIndentation(input), '  hello\nworld');
  });

  it('ignores empty lines when computing indent', () => {
    const input = '  hello\n\n  world';
    assert.equal(stripLeadingIndentation(input), 'hello\n\nworld');
  });

  it('handles mixed tabs and spaces (treats tab as tab)', () => {
    const input = '\thello\n\tworld';
    assert.equal(stripLeadingIndentation(input), 'hello\nworld');
  });

  it('handles no common indent', () => {
    const input = 'hello\n  world';
    assert.equal(stripLeadingIndentation(input), 'hello\n  world');
  });

  it('handles empty string', () => {
    assert.equal(stripLeadingIndentation(''), '');
  });

  it('handles single line', () => {
    assert.equal(stripLeadingIndentation('  hello'), 'hello');
  });
});

// ── removeAllTabs ──

describe('removeAllTabs', () => {
  it('replaces tabs with 2 spaces by default', () => {
    assert.equal(removeAllTabs('\thello'), '  hello');
  });

  it('replaces tabs with custom number of spaces', () => {
    assert.equal(removeAllTabs('\thello', { spaces: 4 }), '    hello');
  });

  it('handles multiple tabs', () => {
    assert.equal(removeAllTabs('\t\thello'), '    hello');
  });

  it('handles empty string', () => {
    assert.equal(removeAllTabs(''), '');
  });

  it('handles no tabs', () => {
    assert.equal(removeAllTabs('hello'), 'hello');
  });
});

// ── trimWhitespace ──

describe('trimWhitespace', () => {
  it('trims leading and trailing whitespace per line', () => {
    assert.equal(trimWhitespace('  hello  \n  world  '), 'hello\nworld');
  });

  it('handles empty string', () => {
    assert.equal(trimWhitespace(''), '');
  });

  it('handles already trimmed text', () => {
    assert.equal(trimWhitespace('hello\nworld'), 'hello\nworld');
  });

  it('preserves empty lines', () => {
    assert.equal(trimWhitespace('hello\n\nworld'), 'hello\n\nworld');
  });

  it('handles tabs', () => {
    assert.equal(trimWhitespace('\thello\t'), 'hello');
  });
});

// ── rewrapText ──

describe('rewrapText', () => {
  it('wraps long lines at 80 chars by default', () => {
    const input = 'a '.repeat(50).trim();
    const output = rewrapText(input);
    const lines = output.split('\n');
    for (const line of lines) {
      assert.ok(line.length <= 80, `Line too long: ${line.length} chars`);
    }
  });

  it('wraps at custom width', () => {
    const input = 'hello world foo bar baz qux';
    const output = rewrapText(input, { width: 15 });
    const lines = output.split('\n');
    for (const line of lines) {
      assert.ok(line.length <= 15, `Line too long: ${line.length} chars`);
    }
  });

  it('preserves paragraph breaks', () => {
    const input = 'para one\n\npara two';
    const output = rewrapText(input, { width: 80 });
    assert.ok(output.includes('\n\n'), 'should preserve paragraph break');
  });

  it('handles empty string', () => {
    assert.equal(rewrapText(''), '');
  });

  it('handles single word longer than width', () => {
    const input = 'superlongword';
    const output = rewrapText(input, { width: 5 });
    assert.ok(output.includes('superlongword'), 'should not break single words');
  });
});

// ── removeForwardingCharacters ──

describe('removeForwardingCharacters', () => {
  it('strips leading > from lines', () => {
    assert.equal(removeForwardingCharacters('> hello\n> world'), 'hello\nworld');
  });

  it('strips leading > with space', () => {
    assert.equal(removeForwardingCharacters('> hello'), 'hello');
  });

  it('strips nested forwarding characters', () => {
    assert.equal(removeForwardingCharacters('>> hello\n>>> world'), '> hello\n>> world');
  });

  it('handles empty string', () => {
    assert.equal(removeForwardingCharacters(''), '');
  });

  it('handles lines without forwarding chars', () => {
    assert.equal(removeForwardingCharacters('hello'), 'hello');
  });
});

// ── text transforms ──

describe('toUpperCase', () => {
  it('converts to uppercase', () => {
    assert.equal(toUpperCase('hello World'), 'HELLO WORLD');
  });

  it('handles empty string', () => {
    assert.equal(toUpperCase(''), '');
  });
});

describe('toLowerCase', () => {
  it('converts to lowercase', () => {
    assert.equal(toLowerCase('HELLO World'), 'hello world');
  });

  it('handles empty string', () => {
    assert.equal(toLowerCase(''), '');
  });
});

describe('toTitleCase', () => {
  it('capitalizes first letter of each word', () => {
    assert.equal(toTitleCase('hello world'), 'Hello World');
  });

  it('skips articles and prepositions mid-sentence', () => {
    assert.equal(toTitleCase('the quick brown fox and the lazy dog'), 'The Quick Brown Fox and the Lazy Dog');
  });

  it('handles empty string', () => {
    assert.equal(toTitleCase(''), '');
  });
});

describe('toSentenceCase', () => {
  it('capitalizes after sentence-ending punctuation', () => {
    assert.equal(toSentenceCase('hello world. goodbye world.'), 'Hello world. Goodbye world.');
  });

  it('handles empty string', () => {
    assert.equal(toSentenceCase(''), '');
  });

  it('handles single sentence', () => {
    assert.equal(toSentenceCase('hello world'), 'Hello world');
  });
});

// ── quote cleaners ──

describe('straightenQuotes', () => {
  it('converts smart quotes to straight', () => {
    assert.equal(straightenQuotes('\u201Chello\u201D \u2018world\u2019'), '"hello" \'world\'');
  });

  it('handles empty string', () => {
    assert.equal(straightenQuotes(''), '');
  });
});

describe('smartenQuotes', () => {
  it('converts straight double quotes to smart', () => {
    assert.equal(smartenQuotes('"hello"'), '\u201Chello\u201D');
  });

  it('converts straight single quotes to smart', () => {
    assert.equal(smartenQuotes("'hello'"), '\u2018hello\u2019');
  });

  it('handles empty string', () => {
    assert.equal(smartenQuotes(''), '');
  });
});

// ── line operations ──

describe('sortLines', () => {
  it('sorts lines alphabetically ascending', () => {
    assert.equal(sortLines('banana\napple\ncherry'), 'apple\nbanana\ncherry');
  });

  it('sorts lines descending', () => {
    assert.equal(sortLines('banana\napple\ncherry', { descending: true }), 'cherry\nbanana\napple');
  });

  it('handles empty string', () => {
    assert.equal(sortLines(''), '');
  });
});

describe('removeDuplicateLines', () => {
  it('removes duplicate lines preserving first occurrence', () => {
    assert.equal(removeDuplicateLines('a\nb\na\nc\nb'), 'a\nb\nc');
  });

  it('handles empty string', () => {
    assert.equal(removeDuplicateLines(''), '');
  });

  it('handles no duplicates', () => {
    assert.equal(removeDuplicateLines('a\nb\nc'), 'a\nb\nc');
  });
});

describe('extractFromHTML', () => {
  it('strips HTML tags', () => {
    assert.equal(extractFromHTML('<p>hello</p>'), 'hello');
  });

  it('decodes HTML entities', () => {
    assert.equal(extractFromHTML('&amp; &lt; &gt; &quot;'), '& < > "');
  });

  it('handles empty string', () => {
    assert.equal(extractFromHTML(''), '');
  });

  it('handles nested tags', () => {
    assert.equal(extractFromHTML('<div><p>hello <strong>world</strong></p></div>'), 'hello world');
  });
});

// ── unwrapParagraphs ──

describe('unwrapParagraphs', () => {
  it('joins single newlines into spaces', () => {
    assert.equal(unwrapParagraphs('hello\nworld'), 'hello world');
  });

  it('preserves paragraph breaks (double newlines)', () => {
    assert.equal(unwrapParagraphs('para one\nline two\n\npara two\nline two'), 'para one line two\n\npara two line two');
  });

  it('handles Windows-style line endings', () => {
    assert.equal(unwrapParagraphs('hello\r\nworld'), 'hello world');
  });

  it('handles triple+ newlines as paragraph breaks', () => {
    assert.equal(unwrapParagraphs('a\n\n\nb'), 'a\n\nb');
  });

  it('handles empty string', () => {
    assert.equal(unwrapParagraphs(''), '');
  });

  it('handles single line (no change)', () => {
    assert.equal(unwrapParagraphs('hello world'), 'hello world');
  });
});

// ── cleanCodePaste ──

describe('cleanCodePaste', () => {
  it('strips leading indent and unwraps hard-wrapped text', () => {
    const input = '    This is a line that\n    was hard wrapped\n    by an editor.';
    assert.equal(cleanCodePaste(input), 'This is a line that was hard wrapped by an editor.');
  });

  it('preserves paragraph breaks', () => {
    const input = '    Para one\n    continues.\n\n    Para two\n    here.';
    assert.equal(cleanCodePaste(input), 'Para one continues.\n\nPara two here.');
  });

  it('collapses extra spaces after unwrap', () => {
    const input = '  hello   world\n  foo   bar';
    assert.equal(cleanCodePaste(input), 'hello world foo bar');
  });

  it('handles empty string', () => {
    assert.equal(cleanCodePaste(''), '');
  });
});

// ── stripEmojis ──

describe('stripEmojis', () => {
  it('removes emoji characters', () => {
    assert.equal(stripEmojis('hello 😀 world 🎉'), 'hello  world ');
  });

  it('removes multi-codepoint emojis', () => {
    assert.equal(stripEmojis('test 👨‍👩‍👧‍👦 end'), 'test  end');
  });

  it('handles text with no emojis', () => {
    assert.equal(stripEmojis('hello world'), 'hello world');
  });

  it('handles empty string', () => {
    assert.equal(stripEmojis(''), '');
  });
});

// ── removeNonASCII ──

describe('removeNonASCII', () => {
  it('removes non-ASCII characters', () => {
    assert.equal(removeNonASCII('hello café'), 'hello caf');
  });

  it('preserves standard ASCII including newlines and tabs', () => {
    assert.equal(removeNonASCII('hello\tworld\n'), 'hello\tworld\n');
  });

  it('removes unicode symbols', () => {
    assert.equal(removeNonASCII('price: €50'), 'price: 50');
  });

  it('handles empty string', () => {
    assert.equal(removeNonASCII(''), '');
  });
});

// ── normalizeUnicode ──

describe('normalizeUnicode', () => {
  it('converts smart quotes to straight', () => {
    assert.equal(normalizeUnicode('\u201Chello\u201D'), '"hello"');
  });

  it('converts em/en dashes to hyphens', () => {
    assert.equal(normalizeUnicode('a\u2014b\u2013c'), 'a--b-c');
  });

  it('converts fancy spaces to regular spaces', () => {
    assert.equal(normalizeUnicode('hello\u00A0world\u2003end'), 'hello world end');
  });

  it('converts ellipsis to three dots', () => {
    assert.equal(normalizeUnicode('wait\u2026'), 'wait...');
  });

  it('handles empty string', () => {
    assert.equal(normalizeUnicode(''), '');
  });
});

// ── stripEmails ──

describe('stripEmails', () => {
  it('removes email addresses', () => {
    assert.equal(stripEmails('contact me at user@example.com thanks'), 'contact me at  thanks');
  });

  it('removes multiple emails', () => {
    assert.equal(stripEmails('a@b.com and c@d.org'), ' and ');
  });

  it('handles text with no emails', () => {
    assert.equal(stripEmails('hello world'), 'hello world');
  });

  it('handles empty string', () => {
    assert.equal(stripEmails(''), '');
  });
});

// ── stripURLs ──

describe('stripURLs', () => {
  it('removes http URLs', () => {
    assert.equal(stripURLs('visit http://example.com today'), 'visit  today');
  });

  it('removes https URLs', () => {
    assert.equal(stripURLs('see https://example.com/path?q=1 here'), 'see  here');
  });

  it('removes www URLs', () => {
    assert.equal(stripURLs('go to www.example.com now'), 'go to  now');
  });

  it('handles text with no URLs', () => {
    assert.equal(stripURLs('hello world'), 'hello world');
  });

  it('handles empty string', () => {
    assert.equal(stripURLs(''), '');
  });
});

// ── removeBlankLines ──

describe('removeBlankLines', () => {
  it('removes empty lines', () => {
    assert.equal(removeBlankLines('a\n\nb\n\nc'), 'a\nb\nc');
  });

  it('removes whitespace-only lines', () => {
    assert.equal(removeBlankLines('a\n   \nb\n\t\nc'), 'a\nb\nc');
  });

  it('handles no blank lines', () => {
    assert.equal(removeBlankLines('a\nb\nc'), 'a\nb\nc');
  });

  it('handles empty string', () => {
    assert.equal(removeBlankLines(''), '');
  });
});

// ── fixPunctuationSpacing ──

describe('fixPunctuationSpacing', () => {
  it('adds space after period if missing', () => {
    assert.equal(fixPunctuationSpacing('Hello.World'), 'Hello. World');
  });

  it('adds space after comma if missing', () => {
    assert.equal(fixPunctuationSpacing('a,b,c'), 'a, b, c');
  });

  it('does not double existing spaces', () => {
    assert.equal(fixPunctuationSpacing('Hello. World'), 'Hello. World');
  });

  it('adds space after exclamation and question marks', () => {
    assert.equal(fixPunctuationSpacing('What?Really!Yes'), 'What? Really! Yes');
  });

  it('does not add space after punctuation at end of line', () => {
    assert.equal(fixPunctuationSpacing('Hello.\nWorld.'), 'Hello.\nWorld.');
  });

  it('does not add space inside numbers like 1.5 or 3,000', () => {
    assert.equal(fixPunctuationSpacing('price is 1.5 or 3,000'), 'price is 1.5 or 3,000');
  });

  it('handles empty string', () => {
    assert.equal(fixPunctuationSpacing(''), '');
  });
});
