import { compilePattern, countMatches, replaceAll } from '../js/find-replace.js';

describe('compilePattern', () => {
  it('compiles literal string to escaped regex', () => {
    const re = compilePattern('hello');
    assert.ok(re instanceof RegExp);
    assert.ok('hello'.match(re));
    assert.ok(!'HELLO'.match(re));
  });

  it('escapes special regex characters in literal mode', () => {
    const re = compilePattern('a.b');
    assert.ok('a.b'.match(re));
    assert.ok(!'axb'.match(re));
  });

  it('compiles regex pattern', () => {
    const re = compilePattern('a.b', { regex: true });
    assert.ok('axb'.match(re));
    assert.ok('a.b'.match(re));
  });

  it('supports case-insensitive mode', () => {
    const re = compilePattern('hello', { caseSensitive: false });
    assert.ok('HELLO'.match(re));
    assert.ok('hello'.match(re));
  });

  it('returns null for empty pattern', () => {
    assert.equal(compilePattern(''), null);
  });

  it('throws on pattern exceeding max length', () => {
    const longPattern = 'a'.repeat(501);
    assert.throws(() => compilePattern(longPattern));
  });

  it('throws on invalid regex', () => {
    assert.throws(() => compilePattern('[invalid', { regex: true }));
  });
});

describe('countMatches', () => {
  it('counts literal matches', () => {
    assert.equal(countMatches('hello hello hello', 'hello'), 3);
  });

  it('counts case-insensitive matches', () => {
    assert.equal(countMatches('Hello HELLO hello', 'hello', { caseSensitive: false }), 3);
  });

  it('counts regex matches', () => {
    assert.equal(countMatches('cat bat hat', '.at', { regex: true }), 3);
  });

  it('returns 0 for no matches', () => {
    assert.equal(countMatches('hello', 'xyz'), 0);
  });

  it('returns 0 for empty text', () => {
    assert.equal(countMatches('', 'hello'), 0);
  });

  it('returns 0 for empty pattern', () => {
    assert.equal(countMatches('hello', ''), 0);
  });
});

describe('replaceAll', () => {
  it('replaces all literal occurrences', () => {
    assert.equal(replaceAll('hello hello hello', 'hello', 'world'), 'world world world');
  });

  it('replaces with case-insensitive matching', () => {
    assert.equal(replaceAll('Hello HELLO hello', 'hello', 'hi', { caseSensitive: false }), 'hi hi hi');
  });

  it('replaces using regex', () => {
    assert.equal(replaceAll('cat bat hat', '.at', 'dog', { regex: true }), 'dog dog dog');
  });

  it('supports regex capture groups in replacement', () => {
    assert.equal(replaceAll('2024-01-15', '(\\d{4})-(\\d{2})-(\\d{2})', '$2/$3/$1', { regex: true }), '01/15/2024');
  });

  it('returns original text for no matches', () => {
    assert.equal(replaceAll('hello', 'xyz', 'abc'), 'hello');
  });

  it('returns original text for empty pattern', () => {
    assert.equal(replaceAll('hello', '', 'world'), 'hello');
  });

  it('handles replacement with empty string', () => {
    assert.equal(replaceAll('hello world', ' world', ''), 'hello');
  });

  it('handles special characters in replacement', () => {
    assert.equal(replaceAll('hello', 'hello', '$&!'), 'hello!');
  });
});
