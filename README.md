# Keen Bear

**Clean text. No fuss.**

A free, zero-dependency text cleaning utility that runs entirely in your browser. Paste in messy text from email, PDFs, code editors, or AI assistants — pick a cleaner, get clean output. No accounts, no server, no data ever leaves your machine.

**[Use Keen Bear →](https://keenbear.com)**

---

## Features

- **25 one-click cleaners** — whitespace, case transforms, unicode normalization, quote handling, emoji stripping, email/URL redaction, and more
- **Clean Code Paste** — one-click combo that strips indentation, unwraps hard-wrapped paragraphs, and collapses extra spaces (built for cleaning AI assistant output)
- **Find & Replace** — literal and regex modes with real-time match count
- **Show Invisibles** — toggle visibility of spaces (·), tabs (→), and newlines (¶)
- **Keyboard shortcuts** — `Alt/⌥+1-9` for the top 9 cleaners, `Alt/⌥+0` for invisibles, plus standard editing shortcuts
- **5 theme flavors** — Salty Octopus (pirate, default), Hazmat (brutalist), Artisanal (minimalist), Butler (formal), Y2K (retro) — each with dark and light modes
- **20-level undo/redo** — every cleaner application is one undo step
- **Offline-capable** — PWA with service worker, installable on desktop and mobile
- **No build step** — plain HTML, CSS, and vanilla JS ES modules
- **143 tests** — full TDD coverage across cleaners, history, and find/replace

## Cleaners

| Category | Cleaners |
|----------|----------|
| **Paste Cleanup** | Clean Code Paste, Unwrap Paragraphs, Normalize Unicode |
| **Whitespace** | Remove Extra Spaces, Remove Extra Returns, Remove Blank Lines, Trim Whitespace, Strip Leading Indentation, Remove All Tabs, Rewrap Text, Remove Forwarding Characters |
| **Quotes & Characters** | Straighten Quotes, Smarten Quotes, Strip Emojis, Remove Non-ASCII |
| **Case Transforms** | UPPERCASE, lowercase, Title Case, Sentence Case |
| **Privacy** | Strip Emails, Strip URLs |
| **Lines** | Sort Lines, Remove Duplicate Lines, Extract from HTML |
| **Writing** | Fix Punctuation Spacing |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl+V` | Paste (strips to plain text) |
| `⌘/Ctrl+C` | Copy |
| `⌘/Ctrl+Z` | Undo |
| `⌘/Ctrl+⇧Z` | Redo |
| `⌘/Ctrl+F` | Find & Replace |
| `⌘/Ctrl+K` or `/` | Focus cleaner filter |
| `Alt/⌥+1-9` | Run cleaner by position |
| `Alt/⌥+0` | Toggle show invisibles |
| `Escape` | Close panel / clear filter |

## Run Locally

No build step. ES modules require a server:

```bash
python3 -m http.server 8787
# open http://localhost:8787
```

## Run Tests

```bash
node test/run-node.js
```

Or open `http://localhost:8787/test/test-runner.html` in your browser.

## Project Structure

```
keenbear/
├── index.html              # App shell + About/Reference/FAQ content
├── style.css               # 5 themes (dark + light each), responsive layout
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache-first)
├── js/
│   ├── app.js              # Entry point + service worker registration
│   ├── ui.js               # DOM wiring, keyboard shortcuts, theme system
│   ├── cleaners.js         # 25 pure (text) => text functions + registry
│   ├── history.js          # Index-based undo/redo stack (20 levels)
│   └── find-replace.js     # Pattern compilation + regex safety
├── test/
│   ├── run-node.js         # Node CLI test runner (143 tests)
│   ├── test-runner.html    # Browser test harness
│   ├── cleaners.test.js    # 108 cleaner tests
│   ├── history.test.js     # 14 history tests
│   └── find-replace.test.js # 21 find/replace tests
├── docs/
│   ├── STATUS.md           # Project state (read this first)
│   ├── plans/              # Implementation plans
│   ├── solutions/          # Solved problems with context
│   └── brainstorms/        # Design exploration
├── keenbear-spec.md        # Product specification
├── AGENTS.md               # AI coding assistant conventions
├── llms.txt                # LLM-readable project summary
├── robots.txt              # Crawler access rules
├── sitemap.xml             # Sitemap for search engines
└── netlify.toml            # Deploy config + security headers
```

## Architecture

Zero dependencies. Each module has a single responsibility:

- **`cleaners.js`** — pure `(text, options?) => text` functions. Adding a cleaner = write the function, add one registry entry, write tests. The UI picks it up automatically.
- **`history.js`** — index-based undo/redo stack. Knows nothing about DOM or cleaners.
- **`find-replace.js`** — pattern compilation with regex safety (500-char cap, invalid pattern handling).
- **`ui.js`** — all DOM interaction. Routes every text mutation through `applyTextChange()` for consistent history tracking.
- **`app.js`** — thin orchestration: imports ui, calls `init()`, registers service worker.

### Adding a New Cleaner

1. Write the function in `js/cleaners.js`
2. Add it to the `cleaners` registry array
3. Write tests in `test/cleaners.test.js`
4. Run `node test/run-node.js`
5. Done — the sidebar, reference docs, and keyboard shortcuts (if top 9) update automatically

## Built With AI

This project was built collaboratively with AI coding assistants using a TDD-first workflow. The `AGENTS.md` file documents the conventions, and the `docs/` directory captures the full development history — plans, decisions, and solutions. Every commit includes `Co-authored-by: factory-droid[bot]` where AI assistance was used.

If you're interested in how AI-assisted development works in practice with vanilla JS, this repo is a complete example from spec to ship.

## License

[Elastic License 2.0 (ELv2)](LICENSE) — free to use, modify, and distribute. You may not offer Keen Bear as a hosted service.

## Author

Built by [Adam Tervort](https://adamtervort.com). Part of a collection of small, useful web tools.
