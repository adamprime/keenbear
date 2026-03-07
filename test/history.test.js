import { History } from '../js/history.js';

describe('History', () => {
  it('starts with empty state', () => {
    const h = new History();
    assert.ok(!h.canUndo, 'should not be able to undo');
    assert.ok(!h.canRedo, 'should not be able to redo');
  });

  it('push adds a state', () => {
    const h = new History();
    h.push('hello');
    assert.ok(h.canUndo, 'should be able to undo after push');
    assert.ok(!h.canRedo, 'should not be able to redo after push');
  });

  it('undo returns the previous state', () => {
    const h = new History();
    h.push('first');
    h.push('second');
    const state = h.undo();
    assert.equal(state, 'first');
  });

  it('redo returns the next state', () => {
    const h = new History();
    h.push('first');
    h.push('second');
    h.undo();
    const state = h.redo();
    assert.equal(state, 'second');
  });

  it('undo at bottom returns null', () => {
    const h = new History();
    h.push('only');
    h.undo();
    const state = h.undo();
    assert.equal(state, null);
  });

  it('redo at top returns null', () => {
    const h = new History();
    h.push('only');
    const state = h.redo();
    assert.equal(state, null);
  });

  it('push after undo clears redo stack', () => {
    const h = new History();
    h.push('first');
    h.push('second');
    h.undo();
    h.push('third');
    assert.ok(!h.canRedo, 'redo stack should be cleared');
    const state = h.undo();
    assert.equal(state, 'first');
  });

  it('respects max depth of 20', () => {
    const h = new History(20);
    for (let i = 0; i < 25; i++) {
      h.push(`state-${i}`);
    }
    let count = 0;
    while (h.canUndo) {
      h.undo();
      count++;
    }
    assert.equal(count, 20, 'should have at most 20 undo levels');
  });

  it('skips duplicate consecutive states (no-op dedupe)', () => {
    const h = new History();
    h.push('same');
    h.push('same');
    h.push('same');
    let count = 0;
    while (h.canUndo) {
      h.undo();
      count++;
    }
    assert.equal(count, 1, 'duplicate pushes should be deduped');
  });

  it('tracks canUndo and canRedo correctly through operations', () => {
    const h = new History();
    assert.ok(!h.canUndo);
    assert.ok(!h.canRedo);

    h.push('a');
    assert.ok(h.canUndo);
    assert.ok(!h.canRedo);

    h.push('b');
    assert.ok(h.canUndo);
    assert.ok(!h.canRedo);

    h.undo(); // back to 'a'
    assert.ok(h.canUndo);
    assert.ok(h.canRedo);

    h.undo(); // back to start
    assert.ok(!h.canUndo);
    assert.ok(h.canRedo);

    h.redo(); // forward to 'a'
    assert.ok(h.canUndo);
    assert.ok(h.canRedo);
  });

  it('supports source metadata on push', () => {
    const h = new History();
    h.push('text', 'cleaner');
    assert.ok(h.canUndo, 'push with source should work');
  });

  it('clear resets all state', () => {
    const h = new History();
    h.push('a');
    h.push('b');
    h.clear();
    assert.ok(!h.canUndo);
    assert.ok(!h.canRedo);
  });
});
