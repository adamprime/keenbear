// Node-based test runner for CI / quick validation
// The canonical test runner is test-runner.html (browser-based)

// Provide a minimal DOM shim for extractFromHTML
globalThis.document = {
  createElement(tag) {
    return {
      set innerHTML(val) { this._html = val; },
      get value() {
        return (this._html || '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      }
    };
  }
};

let currentSuite = null;
const results = [];
let total = 0, passed = 0, failed = 0;

globalThis.describe = function(name, fn) {
  currentSuite = name;
  fn();
  currentSuite = null;
};

globalThis.it = function(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${currentSuite ? currentSuite + ' > ' : ''}${name}`);
  } catch (e) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${currentSuite ? currentSuite + ' > ' : ''}${name}`);
    console.log(`    \x1b[31m${e.message}\x1b[0m`);
  }
};

globalThis.assert = {
  equal(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(`${msg || 'assert.equal'}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
    }
  },
  deepEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${msg || 'assert.deepEqual'}\n  expected: ${e}\n  actual:   ${a}`);
  },
  ok(value, msg) {
    if (!value) throw new Error(msg || `Expected truthy, got ${JSON.stringify(value)}`);
  },
  throws(fn, msg) {
    let threw = false;
    try { fn(); } catch { threw = true; }
    if (!threw) throw new Error(msg || 'Expected function to throw');
  }
};

console.log('\nKeen Bear Tests\n');

await import('./history.test.js');
await import('./cleaners.test.js');
await import('./find-replace.test.js');

console.log(`\n${passed} passed · ${failed} failed · ${total} total\n`);
process.exit(failed > 0 ? 1 : 0);
