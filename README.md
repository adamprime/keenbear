# Keen Bear

**Clean text. No fuss.**

A free, dark-mode text cleaning utility. Paste dirty text in, pick a cleaner, get clean text out. No accounts, no server, no dependencies — runs entirely in your browser.

Part of [Adam Tervort's](https://adamtervort.com) collection of small, useful web tools.

## Features

- **16 one-click cleaners** — Remove extra spaces, collapse blank lines, strip indentation, change case, fix quotes, sort lines, and more
- **Find & Replace** — Literal and regex modes with real-time match count and safety guards
- **Show Invisibles** — Toggle visibility of spaces (·), tabs (→), and newlines (¶)
- **Undo/Redo** — 20-level history for cleaner applications
- **Dark/Light mode** — Dark by default, toggle persisted to localStorage
- **Responsive** — Two-panel desktop layout, mobile bottom sheet
- **Offline-capable** — PWA with service worker, works without internet
- **No build step** — Plain HTML, CSS, and vanilla JS ES modules

## Cleaners

| Cleaner | What it does |
|---------|-------------|
| Remove Extra Spaces | Collapse runs of 2+ spaces, trim trailing |
| Remove Extra Returns | Collapse 3+ newlines to 2 |
| Strip Leading Indentation | Remove smallest common indent |
| Remove All Tabs | Replace tabs with spaces (default 2) |
| Trim Whitespace | Trim leading/trailing whitespace per line |
| Rewrap Text | Reflow to 80 chars/line |
| Remove Forwarding Characters | Strip leading `>` from email quotes |
| UPPERCASE / lowercase | Case conversion |
| Title Case | Smart capitalization (skips articles mid-sentence) |
| Sentence Case | Capitalize after sentence-ending punctuation |
| Straighten Quotes | Curly → straight quotes |
| Smarten Quotes | Straight → curly quotes |
| Sort Lines | Alphabetical ascending/descending |
| Remove Duplicate Lines | Deduplicate, preserving order |
| Extract from HTML | Strip tags, decode entities |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘V` | Paste (strips to plain text) |
| `⌘C` | Copy selection (or all) |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `⌘F` | Open Find & Replace |
| `⌘K` or `/` | Focus cleaner filter |
| `Escape` | Close panel / clear filter |

## Run Locally

No build step required. ES modules need a server:

```bash
python3 -m http.server 8787
# open http://localhost:8787
```

## Run Tests

```bash
# CLI (Node.js)
node test/run-node.js

# Browser
# Open http://localhost:8787/test/test-runner.html
```

99 tests covering history, all 16 cleaners, and find/replace logic.

## Project Structure

```
keenbear/
├── index.html          # App shell
├── style.css           # Dark/light themes, responsive layout
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (cache-first)
├── js/
│   ├── app.js          # Entry point
│   ├── ui.js           # DOM wiring, event handlers
│   ├── cleaners.js     # 16 cleaner functions + registry
│   ├── history.js      # Undo/redo stack
│   └── find-replace.js # Find & Replace logic
├── test/
│   ├── test-runner.html    # Browser test harness
│   ├── run-node.js         # Node CLI test runner
│   ├── history.test.js
│   ├── cleaners.test.js
│   └── find-replace.test.js
└── keenbear-spec.md    # Product specification
```

## Architecture

Each module has a single responsibility:

- **`cleaners.js`** — Pure `(text, options?) => text` functions. Adding a cleaner = one function + one registry entry.
- **`history.js`** — Index-based state stack. Knows nothing about DOM or cleaners.
- **`find-replace.js`** — Pattern compilation with regex safety (length cap, invalid pattern handling).
- **`ui.js`** — All DOM interaction. Routes changes through a central `applyTextChange` function.
- **`app.js`** — Thin orchestration: imports ui, calls init, registers service worker.

## Deploy

Static files — deploy anywhere. Designed for Netlify:

```bash
# No build command needed
# Publish directory: /
```

## License

MIT
