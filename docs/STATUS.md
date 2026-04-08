# Project Status
<!-- Updated: 2026-04-07 -->

## Project Overview
Keen Bear is a free, dark-mode-first text cleaning utility for the web where users paste plain text, run one-click cleaners, and get cleaned output locally in the browser with no account required.


## Current State
V1 complete. Deployed to Netlify. Favicon done. Major feature expansion complete with 25 cleaners, 5 themes, keyboard shortcuts, and full reference documentation.

**Phase:** V1.5 — feature expansion complete
**Last Session:** 2026-04-07
**Last Session Summary:** Deepened the optimization plan and completed Phase 1 correctness fixes on `fix/phase-1-cleaner-correctness` (cleaner regressions covered, `extractFromHTML` made pure, SW cache bumped to v6).

## What's Working
- Product specification: `keenbear-spec.md`
- V1 brainstorm: `docs/brainstorms/2026-03-07-keenbear-v1-brainstorm.md`
- Deepened implementation plan: `docs/plans/2026-03-07-feat-keenbear-v1-text-cleaning-app-plan.md`
- Git initialized with remote `git@github.com:adamprime/keenbear.git`
- **Deployed** to Netlify at keenbear.com
- **Test harness:** `test/test-runner.html` (browser) + `test/run-node.js` (Node CLI) — 157 tests all green
- **`js/history.js`:** Index-based undo/redo stack — 20-level depth, no-op dedupe (14 tests)
- **`js/cleaners.js`:** 25 cleaner functions with registry pattern, priority-ordered (122 tests)
- **`js/find-replace.js`:** Pattern compilation, match counting, replace all with regex safety (21 tests)
- **`js/ui.js`:** Full UI wiring — cleaners, toolbar, keyboard shortcuts (Alt+1-9 for cleaners, Alt+0 for invisibles), filter, find/replace panel, show invisibles, platform-aware shortcut badges
- **`js/app.js`:** Entry point with service worker registration
- **`index.html` + `style.css`:** Two-panel layout, 5 themes (dark/light each), responsive mobile bottom sheet, textarea constrained to 80ch, pinned status bar
- **5 Theme Flavors:** Salty Octopus (default, pirate/nautical), Hazmat (brutalist), Artisanal (minimalist), Butler (formal), Y2K (retro)
- **PWA:** manifest.json + service worker (v6) for offline/installable support
- **GEO/SEO:** JSON-LD (WebApplication + FAQPage), robots.txt, llms.txt, sitemap.xml, netlify.toml, OG + Twitter Card meta, canonical URL
- **About section:** Inline About prose → Cleaner Reference (monospace before/after examples for all 25 cleaners) → FAQ — all flavor-aware styled, below the fold

### Cleaners (25 total, priority-ordered in sidebar)
1. Clean Code Paste (combo: strip indent + trim + unwrap + collapse spaces)
2. Unwrap Paragraphs
3. Normalize Unicode
4. Remove Extra Spaces
5. Remove Extra Returns
6. Remove Blank Lines
7. Trim Whitespace
8. Strip Leading Indentation
9. Remove All Tabs
10. Rewrap Text
11. Remove Forwarding Characters
12. Straighten Quotes / Smarten Quotes
13. Strip Emojis / Remove Non-ASCII
14. UPPERCASE / lowercase / Title Case / Sentence Case
15. Strip Emails / Strip URLs
16. Sort Lines / Remove Duplicate Lines
17. Extract from HTML
18. Fix Punctuation Spacing

## What's In Progress
<!-- Active work items. Update every session. -->

| Item | Status | Branch | Notes |
|------|--------|--------|-------|
| V1 Phases 1-6 | Complete | main | Merged from feat branch |
| GEO Readiness | Complete | main | Structured data, FAQ, crawler access, OG tags |
| Netlify Deploy | Complete | main | Live at keenbear.com |
| Favicon | Complete | main | Done |
| V1.5 Feature Expansion | Complete | main | 9 new cleaners, pirate theme, shortcuts, reference docs |
| Optimization bundle Phase 1 | Complete on branch | fix/phase-1-cleaner-correctness | Cleaner correctness fixes, pure HTML extraction, SW cache bump, 157 tests green |

## What's Next
<!-- Prioritized backlog. Top item = next thing to work on. -->

1. **Optimization bundle Phase 2** — SW stale-while-revalidate + update notification
2. **Optimization bundle Phase 3** — `ui.js` split + invisibles/status perf work
3. **My Scrub** — chained cleaner feature (v2 headline feature)

## Open Decisions
<!-- Architectural or product decisions that haven't been made yet. -->

| Decision | Options Considered | Leaning Toward | Blocking? |
|----------|--------------------|----------------|-----------|
| My Scrub persistence | localStorage JSON vs URL-encoded | localStorage | No |
| My Scrub UI | Drag-and-drop reorder vs checkbox list | TBD | No |

## Known Issues
<!-- Bugs, tech debt, or things that are broken but not urgent. -->

- Show Invisibles overlay can jank on very large documents (10k+ lines)
- `textarea` native undo and custom history coexist via `lastActionWasCleaner` flag — edge cases possible with rapid mixed input

## Environment & Setup
<!-- How to run this project. Critical for fresh agent sessions. -->

**Run locally:** `python3 -m http.server 8787` then open http://localhost:8787 (ES modules require a server).
**Run tests:** `node test/run-node.js` (CLI) or open `test/test-runner.html` in browser via server.
**Deploy:** Static deployment on Netlify at keenbear.com.
**Key env vars:** None.

## Architecture Notes
<!-- Brief description of how the system is structured. -->

Single-page, client-only app (no server, no accounts, no external dependencies). Local state and preferences persisted via `localStorage` (prefixed `kb-`). All text operations are pure `(text, options?) => text` functions. UI auto-discovers cleaners from the registry array — adding a cleaner requires no HTML changes.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+V | Paste |
| ⌘/Ctrl+C | Copy |
| ⌘/Ctrl+Z | Undo |
| ⌘/Ctrl+⇧Z | Redo |
| ⌘/Ctrl+F | Find & Replace |
| ⌘/Ctrl+K or / | Focus cleaner filter |
| Alt/⌥+1-9 | Run cleaner by position |
| Alt/⌥+0 | Toggle show invisibles |
| Escape | Close panels / clear filter |

## Session Log
<!-- Brief log of recent sessions. Newest first. Delete entries older than 30 days. -->

### 2026-04-07 (session 6)
- **Goal:** Deepen the optimization plan and execute Phase 1 correctness fixes
- **Accomplished:**
  - Deepened `docs/plans/2026-04-07-refactor-app-optimization-bundle-plan.md` with research-backed decisions and corrected false assumptions (`style.css` already cached, paste is a second mutation path)
  - Fixed `stripEmojis` to preserve bare digits, `#`, and `*` while still stripping keycaps, flags, skin tones, and tag-sequence emoji
  - Rewrote `extractFromHTML` as a pure function with script/style/comment stripping, named + numeric entity decoding, newline preservation, and no DOM dependency
  - Tightened `stripURLs` to preserve trailing punctuation and `fixPunctuationSpacing` to respect closing quotes/brackets
  - Removed the Node DOM shim from `test/run-node.js`, added `TESTING_GUIDE.md`, and bumped the service worker cache to `keenbear-v6`
  - Expanded the suite from 143 to 157 passing tests
- **Didn't finish:** Phase 2 SW strategy update, Phase 3 `ui.js` refactor/perf work
- **Discovered:** A single-pass entity decoder avoids accidental double-decoding, and preserving post-URL punctuation is easiest as a replacement callback rather than a larger URL regex.

### 2026-03-17 (session 5)
- **Goal:** Feature expansion — new cleaners, pirate theme, keyboard shortcuts, UX improvements
- **Accomplished:**
  - Added 9 new cleaners (25 total, 143 tests): unwrap paragraphs, clean code paste, strip emojis, remove non-ASCII, normalize unicode, strip emails, strip URLs, remove blank lines, fix punctuation spacing
  - Reordered cleaner registry by usage priority (paste cleanup first)
  - New "Salty Octopus" pirate theme (deep ocean navy + treasure gold, full pirate copy), set as default
  - Replaced collapsible FAQ with inline About → Cleaner Reference (monospace before/after examples) → FAQ
  - Constrained textarea + invisibles overlay to max-width 80ch
  - Fixed layout: editor fills viewport, about section below the fold (body overflow, flex-shrink)
  - Pinned status bar to bottom of viewport
  - Alt/Option+1-9 keyboard shortcuts for top 9 cleaners with visible badges in sidebar
  - Alt/Option+0 toggles show invisibles
  - Visible kbd shortcut badges on all toolbar buttons, platform-aware (Mac ⌘/⌥ vs Ctrl/Alt)
  - Fixed Hazmat theme readability (Impact only for headings/buttons, system font for body)
  - Fixed Mac Alt+number shortcuts (use e.code not e.key to avoid composed characters)
  - Fixed cleanCodePaste leading space bug (added trimWhitespace to combo chain)
  - Service worker bumped to v5, structured data + llms.txt updated
- **Didn't finish:** My Scrub (v2), mobile UX review
- **Discovered:** Mac Option+number keys produce composed characters (¡™£...) in e.key — must use e.code for physical key detection. `overflow: hidden` on body prevents scrolling below-fold content in flex layouts. Impact font as --font-sans makes all body text unreadable — split into --font-display for headings only.

### 2026-03-08 (session 4)
- **Goal:** GEO readiness audit and implementation
- **Accomplished:** Ran full 6-dimension GEO audit (scored 24/100 pre-work). Implemented all 7 priority actions: fixed OG tags with absolute URLs + Twitter Cards, added JSON-LD structured data (WebApplication + FAQPage), created robots.txt with AI search/training crawler rules, llms.txt, sitemap.xml, netlify.toml with security headers, canonical URL, meta author. Built collapsible 8-item FAQ section below the fold with full flavor-aware styling. OG image created (og-image.png). Service worker bumped to v3.
- **Didn't finish:** Netlify deploy, favicon extraction
- **Discovered:** GEO audit methodology — FAQPage schema + on-page FAQ content is the highest-impact GEO signal for utility apps.

### 2026-03-07 (session 3)
- **Goal:** UI/UX overhaul and flavor system
- **Accomplished:** Added a dynamic "flavor" system with 4 distinct visual and copy themes: Hazmat (brutalist/industrial), Artisanal (minimalist/pretentious), Butler (formal/passive-aggressive), and Y2K (nostalgic shareware). Flavor choice is persisted to localStorage and updates both CSS variables and DOM text content instantly.

### 2026-03-07 (session 2)
- **Goal:** Implement all 6 phases of v1
- **Accomplished:** All phases complete — TDD foundation (99 tests), HTML/CSS shell with dark/light themes, full UI wiring (cleaners, toolbar, shortcuts, filter), Find & Replace with regex safety, Show Invisibles overlay, PWA manifest + service worker
- **Didn't finish:** Favicon extraction from mascot image, OG image creation
- **Discovered:** History module needed redesign from stack-based to index-based model for correct undo/redo semantics; rAF scroll sync works well for invisibles overlay

### 2026-03-07 (session 1)
- **Goal:** Plan v1 of Keen Bear text cleaning app
- **Accomplished:** Product spec finalized; v1 brainstorm completed; full 6-phase implementation plan written; plan deepened with research insights (architecture, performance, security, UX, testing, race conditions, regex safety); git repo initialized and pushed to GitHub
- **Didn't finish:** No implementation code yet
- **Discovered:** IME composition handling, clipboard secure-context requirements, and dual-threshold history policy are non-obvious requirements captured in the plan
