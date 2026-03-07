---
title: "feat: Keen Bear v1 Text Cleaning App"
type: feat
date: 2026-03-07
brainstorm: docs/brainstorms/2026-03-07-keenbear-v1-brainstorm.md
spec: keenbear-spec.md
---

# feat: Keen Bear v1 -- Text Cleaning Web App

## Enhancement Summary

**Deepened on:** 2026-03-07  
**Sections enhanced:** 10  
**Research agents/skills used:** architecture-strategist, julik-frontend-races-reviewer, performance-oracle, security-sentinel, code-simplicity-reviewer, pattern-recognition-specialist, design-implementation-reviewer, best-practices-researcher, framework-docs-researcher, frontend-design, document-review

### Key Improvements
1. Added a deterministic text-mutation pipeline and command-style app actions to reduce race conditions and state drift.
2. Added explicit IME/paste/shortcut event-order guidance, including composition-safe keyboard handling.
3. Added performance guardrails: history memory budgeting, no-op dedupe, and regex-safety constraints for find/replace.

### New Considerations Discovered
- Database/schema/deployment review lenses are not applicable for v1 because the app is fully client-only with no backend.
- Clipboard and shortcut behavior needs secure-context and accessibility guardrails (user activation + focus scoping).
- `beforeinput`/composition event handling is required to avoid IME corruption and shortcut conflicts.

## Overview

Build the complete v1 of Keen Bear: a free, dark-mode-first, client-only web app for cleaning plain text. No framework, no build step, no server. ES module architecture with SOLID principles, developed via TDD.

The app ships as static files (`index.html`, `style.css`, and JS modules) deployable to Netlify.

## Problem Statement / Motivation

Adam frequently needs to clean text pasted from coding tools, emails, and documents -- stripping indentation, removing extra whitespace, reflowing wrapped lines. TextSoap (macOS) solves this but is desktop-only, light-mode-only, and dated. Keen Bear brings the same utility to the web with dark mode and mobile support.

## Proposed Solution

A two-panel web app (text area + cleaner sidebar) built with vanilla HTML/CSS/JS using native ES modules. Each cleaner is a pure `(text) => text` function registered in a cleaner registry. A custom undo/redo stack tracks cleaner applications. The UI is responsive: desktop shows a sidebar, mobile shows a bottom sheet/drawer.

### Research Insights

**Best Practices:**
- Route all text changes through one mutation function (`applyTextChange`) so cleaner clicks, paste, clear, undo/redo, and replace-all share consistent behavior.
- Enforce a cleaner contract (`fn(text, options = {})`) and registry metadata shape to keep additions predictable.
- Isolate browser APIs (clipboard, storage, shortcuts) behind adapter modules to avoid scattering edge-case logic.

**Performance Considerations:**
- Keep history bounded by both depth and byte-size budget.
- Skip no-op snapshots (`next === prev`) and dedupe identical adjacent states.

**Implementation Details:**
```js
function applyTextChange({ source, run }) {
  const prev = textarea.value;
  const next = run(prev);
  if (next === prev) return;
  history.push({ text: prev, source });
  textarea.value = next;
  renderStatus(next);
}
```

**Edge Cases:**
- Async clipboard reads can return stale data if multiple paste requests overlap.
- Cleaner actions should be ignored while IME composition is active.

### File Structure

```
keenbear/
├── index.html          # Shell: layout, toolbar, panels
├── style.css           # All styles, CSS custom properties for theming
├── js/
│   ├── app.js          # Entry point, wires modules together
│   ├── cleaners.js     # Cleaner registry + all cleaner functions
│   ├── history.js      # Undo/redo stack
│   └── ui.js           # DOM manipulation, event handlers, rendering
├── test/
│   ├── cleaners.test.js
│   ├── history.test.js
│   └── test-runner.html  # Browser-based test harness (no Node required)
├── keenbear.png        # Mascot image
└── keenbear-spec.md    # Product spec
```

### SOLID Architecture

| Module | Responsibility | SOLID Principle |
|--------|---------------|-----------------|
| `cleaners.js` | Exports a registry of named `(text) => text` functions. Adding a cleaner = adding one function + one registry entry. | Open/Closed, Single Responsibility |
| `history.js` | Exports a History class with `push(state)`, `undo()`, `redo()`, `canUndo`, `canRedo`. Knows nothing about DOM or cleaners. | Single Responsibility, Interface Segregation |
| `ui.js` | Reads from the cleaner registry and history interface to render the UI. Handles all DOM events. Depends on abstractions, not internals. | Dependency Inversion, Single Responsibility |
| `app.js` | Imports modules, initializes the app, connects the pieces. Thin orchestration layer. | Dependency Inversion |

### Research Insights

**Best Practices:**
- Split `cleaners.js` into `cleaners/registry.js`, `cleaners/core/*`, and optional `cleaners/engine.js` once file size grows.
- Add a command layer (`applyCleaner`, `undo`, `redo`, `replaceAll`, `toggleTheme`) between DOM events and modules.
- Keep complex features (`find/replace`, `show invisibles`) in feature folders to protect core editor simplicity.

**Anti-Patterns to Avoid:**
- Mixing browser event handlers directly with history mutation logic.
- Feature-specific keyboard listeners spread across modules without a single precedence map.

## Implementation Phases

### Phase 1: Foundation + Core Cleaners (TDD)

Build the testable core with zero UI.

**Tasks:**
- [x] Set up `test/test-runner.html` -- a minimal browser-based test harness (no dependencies; simple assert functions, DOM output)
- [x] Write failing tests for `history.js`: push, undo, redo, stack limits (20 levels), canUndo/canRedo
- [x] Implement `history.js` to pass tests
- [x] Write failing tests for each core cleaner function:
  - [x] `removeExtraSpaces(text)` -- collapse 2+ spaces, trim trailing per line
  - [x] `removeExtraReturns(text)` -- collapse 3+ newlines to 2
  - [x] `stripLeadingIndentation(text)` -- detect smallest common indent, remove from all lines, handle mixed tabs/spaces
  - [x] `removeAllTabs(text)` -- replace tabs with N spaces (default 2)
  - [x] `trimWhitespace(text)` -- trim leading+trailing whitespace per line
  - [x] `rewrapText(text, width)` -- reflow to N chars/line (default 80)
- [x] Implement each cleaner to pass tests
- [x] Create `cleaners.js` with registry pattern: `export const cleaners = [{ id, name, fn, category }]`

**Tests prove:** Every cleaner produces correct output for normal input, edge cases (empty string, single line, huge input), and mixed whitespace scenarios.

### Research Insights

**Best Practices:**
- Use table-driven test fixtures for cleaners to enforce consistent edge-case coverage.
- Add property-style checks where applicable (idempotence, newline stability, no unintended character loss).
- Add performance assertions for large fixtures (10k+ lines) in the browser harness.

**Edge Cases:**
- Mixed Unicode whitespace (`\u00A0`, `\u2009`) should have explicit expected behavior.
- Tabs + spaces indentation detection must be deterministic and documented in tests.

### Phase 2: HTML Shell + Styling

Build the visual layout with no interactivity.

**Tasks:**
- [x] Create `index.html` with semantic structure: header (mascot + wordmark + tagline), toolbar, main (text area + sidebar), status bar, footer
- [x] Create `style.css` with CSS custom properties for theming (`--bg`, `--fg`, `--accent`, etc.)
- [x] Implement dark theme as default (dark background ~#1a1a2e, light text, high contrast)
- [x] Implement light theme via `.light-mode` class on `<body>`
- [x] Style two-panel layout: text area (left, ~70%) + cleaner sidebar (right, ~30%)
- [x] Style toolbar buttons: Paste, Copy All, Clear, Undo, Redo, theme toggle
- [x] Style cleaner list items with hover state and click flash
- [x] Style status bar (character/word/line counts)
- [x] Style filter input above cleaner list
- [x] Add responsive breakpoint: below 768px, hide sidebar, add floating button for bottom sheet
- [x] Style bottom sheet / drawer for mobile cleaner panel
- [x] Monospace font stack: `'SF Mono', 'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace`
- [x] Footer: "Built by Adam Tervort" link

### Research Insights

**Best Practices:**
- Define contrast tokens for dark mode and verify AA for text, placeholders, borders, and focus rings.
- Use 44px minimum touch targets and safe-area padding for bottom controls on iOS.
- Keep keyboard focus indicators explicit (`:focus-visible`) in both themes.

**References:**
- https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html
- https://www.w3.org/WAI/ARIA/apg/patterns/

### Phase 3: UI Wiring + Interactivity

Connect the modules to the DOM.

**Tasks:**
- [x] `ui.js`: Render cleaner list from registry dynamically
- [x] Wire cleaner clicks: read textarea value, apply cleaner fn, push to history, update textarea
- [x] Wire toolbar buttons:
  - [x] Paste -- `navigator.clipboard.readText()`, strip to plain text
  - [x] Copy All -- `navigator.clipboard.writeText()`
  - [x] Clear -- empty textarea, push to history
  - [x] Undo/Redo -- restore from history stack, update textarea
- [x] Wire theme toggle -- toggle `.light-mode` on body, persist to `localStorage`
- [x] Wire status bar -- update char/word/line counts on input and after cleaner runs
- [x] Wire filter bar -- substring match on cleaner names, show/hide list items
- [x] Wire keyboard shortcuts:
  - [x] Cmd+Z / Cmd+Shift+Z for undo/redo (intercept to use custom history when cleaner was applied)
  - [x] Cmd+K or `/` to focus filter
  - [x] Escape to clear filter
- [x] Ensure pasting rich text strips to plain text (`paste` event handler)
- [x] `app.js`: Import all modules, call init

### Research Insights

**Best Practices:**
- Handle IME composition explicitly; skip shortcut/cleaner interception while composing.
- Use explicit shortcut precedence by active scope (textarea, filter input, find panel, drawer).
- Ensure clipboard actions only run from user gestures and handle permission failures with clear UI states.

**Implementation Details:**
```js
let composing = false;
textarea.addEventListener('compositionstart', () => (composing = true));
textarea.addEventListener('compositionend', () => (composing = false));

window.addEventListener('keydown', (e) => {
  if (composing || e.isComposing) return;
  // route shortcut by current focus scope
});
```

**References:**
- https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event
- https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
- https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/inputType

### Phase 4: Find & Replace

**Tasks:**
- [ ] Write tests for find & replace logic: literal match, regex match, case-sensitive toggle, match count, replace all
- [ ] Implement find/replace as a cleaner with UI panel (inline above or below text area)
- [ ] Real-time match count display
- [ ] Replace All applies as one undo step
- [ ] Cmd+F opens the panel, Escape closes it

### Research Insights

**Best Practices:**
- Separate literal and regex modes with explicit validation and user feedback.
- Enforce pattern-length caps and guardrails against backtracking-prone expressions.
- Treat replace-all as a single atomic command in custom history.

**Edge Cases:**
- Invalid regex patterns must never break the app state.
- Empty-match regex should be handled to avoid infinite loops in replace-all.

**References:**
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Assertions
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookbehind_assertion

### Phase 5: Show Invisibles

**Tasks:**
- [ ] Implement "show invisibles" toggle in toolbar
- [ ] When active, render a `<div>` overlay (or switch to a read-only rendered view) that displays:
  - [ ] `·` for spaces
  - [ ] `¶` for newlines / paragraph marks
  - [ ] `→` for tabs
  - [ ] Visible line break indicators
- [ ] Text remains editable (either via synced textarea underneath, or contenteditable overlay)
- [ ] Toggle state persisted to `localStorage`

### Research Insights

**Best Practices:**
- Keep the overlay non-interactive (`pointer-events: none`) and render using `textContent`, never `innerHTML`.
- Use `requestAnimationFrame`-based scroll synchronization between textarea and overlay.
- Hide overlay decoration from assistive technology if it can cause duplicate reading.

**Edge Cases:**
- Ensure selection/caret visibility remains clear when overlay mode is enabled.
- Large documents should throttle overlay repainting to avoid jank.

### Phase 6: Polish + Nice-to-Have Cleaners

**Tasks:**
- [ ] Add nice-to-have cleaners (tests first for each):
  - [ ] Remove Forwarding Characters
  - [ ] UPPERCASE / lowercase / Title Case / Sentence case
  - [ ] Straighten Quotes / Smarten Quotes
  - [ ] Sort Lines (ascending/descending)
  - [ ] Remove Duplicate Lines
  - [ ] Extract from HTML
- [ ] Add PWA manifest for "install as app" support
- [ ] Add favicon (bear mascot head)
- [ ] Add OG meta tags (title, description, image)
- [ ] Final responsive polish and cross-browser testing

### Research Insights

**Best Practices:**
- Gate nice-to-have cleaners behind clear priority labels so v1 can ship without over-expanding scope.
- Add a minimal service worker only after core behavior is stable; use cache-first for app shell, network-first for optional external assets.

**References:**
- https://web.dev/articles/service-worker-caching-and-http-caching
- https://web.dev/learn/pwa/serving

## Technical Considerations

**Show Invisibles complexity:** This is the trickiest UI feature. A `<textarea>` cannot render styled characters inline. Two approaches:
1. **Overlay div** -- Position a `<div>` exactly over the textarea, render the decorated text in it, make the textarea transparent. User types in the textarea, overlay re-renders on input. Scroll sync required.
2. **Contenteditable swap** -- When "show invisibles" is on, hide the textarea and show a contenteditable div with decorated text. Sync content back to textarea on toggle-off.

Approach 1 (overlay) is more robust for maintaining native textarea behavior. Approach 2 is simpler but risks subtle editing bugs. Decide during Phase 5 implementation.

**Undo/Redo dual stack:** Native textarea undo handles keystrokes. The custom History stack handles cleaner applications. The UI needs to intercept Cmd+Z and decide: if the last action was a cleaner, use custom history; if the last action was typing, let native undo handle it. A flag (`lastActionWasCleaner`) can gate this.

**Performance:** Cleaners must handle 10k+ line inputs without lag. All cleaner functions should operate on the full string (no line-by-line DOM manipulation). Regex-based cleaners should be tested for catastrophic backtracking.

### Research Insights

**Best Practices:**
- Set explicit performance budgets (e.g., lightweight cleaners <100ms on 10k lines; heavy operations show progress state).
- Offload high-cost transforms (rewrap/find-replace on very large text) to a Web Worker when thresholds are exceeded.
- Make history policy dual-threshold (`maxSteps` + `maxBytes`) to cap memory usage in long sessions.

**Implementation Details:**
```js
function compileUserRegex(pattern, flags) {
  if (pattern.length > 200) throw new Error('Pattern too long');
  return new RegExp(pattern, flags);
}
```

**Edge Cases:**
- Browser private mode can reduce storage reliability; theme/show-invisibles persistence should fail gracefully.

**References:**
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

## Acceptance Criteria

- [ ] All core cleaners produce correct output (verified by tests)
- [ ] Undo/redo works for both typing and cleaner applications (20 levels)
- [ ] Dark mode is default; light mode toggle works and persists
- [ ] Responsive layout: sidebar on desktop (>768px), bottom sheet on mobile
- [ ] Paste strips rich text to plain text
- [ ] Copy All copies full textarea contents
- [ ] Status bar shows accurate char/word/line counts, updates live
- [ ] Filter bar filters cleaner list by name
- [ ] Find & Replace works with literal and regex, shows match count
- [ ] Show invisibles renders space/tab/newline indicators
- [ ] Keyboard shortcuts work (Cmd+Z, Cmd+Shift+Z, Cmd+F, Cmd+K, Escape)
- [ ] Works offline (no external requests)
- [ ] No build step required -- open `index.html` in browser to run

### Research Insights

**Additions for measurable verification:**
- [ ] IME composition tests pass (no cleaner/shortcut interception during composition).
- [ ] Clipboard permission-denied flow is handled without breaking UX.
- [ ] 10k-line performance budget checks pass for core cleaners.
- [ ] Regex-mode safety tests pass (invalid pattern, risky pattern, empty-match behavior).
- [ ] Keyboard character shortcuts follow WCAG 2.1.4 (focus-scoped or disable/remap support).

## Success Metrics

- Adam uses it instead of TextSoap for daily text cleaning
- Works smoothly on iPhone Safari for quick mobile cleanups
- Page loads instantly (no network requests, no framework overhead)

## Dependencies & Risks

- **No external dependencies.** Everything is vanilla JS.
- **Risk: Show Invisibles complexity.** The overlay/swap approach needs prototyping. Mitigated by making it Phase 5 (after core is solid) and having a fallback (skip overlay, just show a read-only rendered view).
- **Risk: Undo stack edge cases.** Mixing native textarea undo with custom history can get confusing. Mitigated by TDD and clear flag-based gating.
- **Risk: Mobile Safari quirks.** Clipboard API and keyboard shortcut behavior vary on iOS. Test early on a real device.

### Research Insights

**Additional Risks + Mitigations:**
- **Risk: Shortcut collisions / accidental activation.** Mitigate with scope-aware routing and optional toggle/remap for character shortcuts.
- **Risk: Clipboard blocked by secure-context/user-activation rules.** Mitigate with explicit fallback messaging and disabled-state UX.
- **Risk: Overlay render jank on large input.** Mitigate with throttled repaint and optional auto-disable threshold for show-invisibles.

## References

- Product spec: `keenbear-spec.md`
- Brainstorm: `docs/brainstorms/2026-03-07-keenbear-v1-brainstorm.md`
- Inspiration: TextSoap (macOS app by Unmarked Software)
