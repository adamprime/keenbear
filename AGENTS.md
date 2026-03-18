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
| `js/ui.js` | All DOM manipulation, event handlers, rendering, keyboard shortcuts (Alt+1-9 cleaners, Alt+0 invisibles) |
| `js/app.js` | Entry point — imports ui, calls `init()`, registers service worker |

### Key Patterns

- **Central mutation:** All text changes go through `applyTextChange(run, source)` in `ui.js`. This ensures consistent history tracking, status updates, and invisibles re-rendering.
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

- **143 tests** across 3 test files (history, cleaners, find-replace)
- Browser harness: `test/test-runner.html` (opens in browser, renders results to DOM)
- Node runner: `test/run-node.js` (minimal DOM shim for `extractFromHTML`)
- Test framework is custom (no dependencies): `describe`, `it`, `assert.equal/ok/deepEqual/throws`
- TDD workflow: write failing tests first, implement to green

## Conventions

- No external dependencies. Ever. This is a zero-dependency project.
- No build step. The source files ARE the production files.
- CSS custom properties for all theme-sensitive values (`--bg`, `--fg`, `--accent`, etc.)
- Monospace font stack: `'SF Mono', 'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace`
- Semantic HTML with ARIA labels for accessibility
- `localStorage` keys are prefixed with `kb-` (e.g., `kb-theme`, `kb-invisibles`)

## File Locations

- Product spec: `keenbear-spec.md`
- Implementation plan: `docs/plans/2026-03-07-feat-keenbear-v1-text-cleaning-app-plan.md`
- Project status: `docs/STATUS.md`
- Mascot image: `keenbear.png`

## Security Notes

- No server, no API calls, no data leaves the browser
- Clipboard API requires secure context (HTTPS or localhost)
- Regex patterns capped at 500 characters to prevent ReDoS
- `extractFromHTML` uses `textContent` assignment (not `innerHTML` for output) to prevent XSS
- Service worker uses cache-first strategy — no network requests in normal operation

## Known Limitations

- Show Invisibles overlay can jank on very large documents (10k+ lines)
- `textarea` native undo and custom history coexist via a `lastActionWasCleaner` flag — edge cases possible with rapid mixed input
- IME composition events are guarded but not exhaustively tested across all input methods
