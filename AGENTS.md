# Keen Bear — AGENTS.md

## Project Overview

Keen Bear is a client-only text cleaning web utility. No framework, no build step, no server, no external dependencies. Everything is vanilla HTML/CSS/JS with ES modules.

## Stack

- Plain HTML + CSS + vanilla JS (ES modules)
- No package manager dependencies (package.json exists only for `"type": "module"` Node test support)
- Dark-mode-first design with CSS custom properties for theming
- PWA with service worker for offline support

## How to Run

```bash
# Dev server (ES modules require a server)
python3 -m http.server 8787

# Run tests
node test/run-node.js
```

## Architecture

### Module Responsibilities

| Module | Role |
|--------|------|
| `js/cleaners.js` | Pure `(text, options?) => text` functions + registry array (25 cleaners) |
| `js/history.js` | Index-based undo/redo stack (20 levels, no-op dedupe) |
| `js/find-replace.js` | Pattern compilation, match counting, replace with regex safety |
| `js/ui/dom.js` | DOM refs, history-backed mutation helpers, cleaner list rendering, status updates |
| `js/ui/flavors.js` | Pure flavor copy/theme data |
| `js/ui/theme.js` | Theme and flavor initialization/toggling |
| `js/ui/invisibles.js` | Invisibles rendering, scroll sync, large-document guard |
| `js/ui/find.js` | Find & Replace panel wiring |
| `js/ui/keyboard.js` | Keyboard shortcut handler factory (`e.code` for Alt+digits) |
| `js/ui/index.js` | UI composition root and event wiring |
| `js/app.js` | Entry point — imports ui, calls `init()`, registers service worker |

### Key Patterns

- **Central mutation:** Most text changes go through `applyTextChange(run, source)` in `js/ui/dom.js`. Paste still has a documented second mutation path in `handlePasteEvent()`, and both paths must keep history/status/invisibles hooks aligned.
- **Cleaner contract:** Every cleaner is `fn(text, options?) => text`. Adding a new cleaner = write the function, add one entry to the `cleaners` array in `cleaners.js`, write tests.
- **No framework abstractions.** Direct DOM manipulation. `document.getElementById`, `addEventListener`, `createElement`.
- **Theme system:** 5 flavors (Salty Octopus default, Hazmat, Artisanal, Butler, Y2K) with `--font-display` for headings and `--font-sans` for body text. Each flavor has dark + light mode CSS variables and custom copy (tagline, placeholders, sidebar title).
- **Keyboard shortcuts:** Alt/Option+1-9 for top 9 cleaners, Alt/Option+0 for invisibles. Uses `e.code` (not `e.key`) to avoid Mac composed character issues.

### Adding a New Cleaner

1. Write the function in `js/cleaners.js`
2. Add it to the `cleaners` registry array with `{ id, name, fn, category }`
3. Export it for direct import in tests
4. Write tests in `test/cleaners.test.js`
5. Run `node test/run-node.js` to verify
6. The UI picks it up automatically from the registry — no HTML changes needed

## Testing

- **165 tests** across 5 test files (history, cleaners, find-replace, ui-invisibles, ui-keyboard)
- Browser harness: `test/test-runner.html` (opens in browser, renders results to DOM)
- Node runner: `test/run-node.js` (no DOM shim needed; `extractFromHTML` is pure)
- Test framework is custom (no dependencies): `describe`, `it`, `assert.equal/ok/deepEqual/throws`
- TDD workflow: write failing tests first, implement to green

## Conventions

- No external dependencies. Ever. This is a zero-dependency project.
- No build step. The source files ARE the production files.
- CSS custom properties for all theme-sensitive values (`--bg`, `--fg`, `--accent`, etc.)
- Monospace font stack: `'SF Mono', 'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace`
- Semantic HTML with ARIA labels for accessibility
- `localStorage` keys are prefixed with `kb-` (e.g., `kb-theme`, `kb-invisibles`)
- Bump `CACHE_VERSION` in `sw.js` for any deploy that changes a cached asset (see `docs/plans/2026-04-07-refactor-app-optimization-bundle-plan.md`, Phase 2)

## File Locations

- Product spec: `keenbear-spec.md`
- Implementation plan: `docs/plans/2026-03-07-feat-keenbear-v1-text-cleaning-app-plan.md`
- Project status: `docs/STATUS.md`
- Mascot image: `keenbear.png`

## Security Notes

- No server, no API calls, no data leaves the browser
- Clipboard API requires secure context (HTTPS or localhost)
- Regex patterns capped at 500 characters to prevent ReDoS
- `extractFromHTML` strips tags and decodes entities with a pure string pipeline; it does not rely on DOM parsing
- Service worker uses stale-while-revalidate for shell assets and cache-first for images

## Known Limitations

- Show Invisibles auto-disables on very large documents (~500KB) to avoid jank
- `textarea` native undo and custom history coexist via a `lastActionWasCleaner` flag — edge cases possible with rapid mixed input
- IME composition events are guarded but not exhaustively tested across all input methods
