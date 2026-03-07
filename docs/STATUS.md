# Project Status
<!-- Updated: 2026-03-07 by Adam -->

## Project Overview
Keen Bear is a free, dark-mode-first text cleaning utility for the web where users paste plain text, run one-click cleaners, and get cleaned output locally in the browser with no account required.


## Current State
Phase 1 complete. Phase 2 in progress.

**Phase:** Phase 2 — HTML shell + styling
**Last Session:** 2026-03-07
**Last Session Summary:** Completed Phase 1 (TDD foundation). 76 tests passing for history module and 16 cleaner functions. Now building the UI shell.

## What's Working
- Product specification: `keenbear-spec.md`
- V1 brainstorm: `docs/brainstorms/2026-03-07-keenbear-v1-brainstorm.md`
- Deepened implementation plan: `docs/plans/2026-03-07-feat-keenbear-v1-text-cleaning-app-plan.md`
- Git initialized with remote `git@github.com:adamprime/keenbear.git`
- **Test harness:** `test/test-runner.html` (browser) + `test/run-node.js` (Node CLI)
- **`js/history.js`:** Undo/redo stack — 20-level depth, no-op dedupe, source metadata, clear (12 tests)
- **`js/cleaners.js`:** 16 cleaner functions with registry pattern (64 tests)

## What's In Progress
<!-- Active work items. Update every session. -->

| Item | Status | Branch | Notes |
|------|--------|--------|-------|
| Phase 1: Foundation + Core Cleaners | Complete | feat/phase-1-foundation-core-cleaners | 76 tests green |
| Phase 2: HTML Shell + Styling | In progress | feat/phase-1-foundation-core-cleaners | Building layout + dark theme |

## What's Next
<!-- Prioritized backlog. Top item = next thing to work on. -->

1. **Phase 2** — `index.html` + `style.css` shell (dark theme, two-panel layout, responsive)
2. **Phase 3** — Wire UI to modules (cleaner clicks, toolbar, shortcuts, paste handling)
3. **Phase 4** — Find & Replace (with regex safety guards)
4. **Phase 5** — Show Invisibles overlay
5. **Phase 6** — Polish, nice-to-have cleaners, PWA manifest

## Open Decisions
<!-- Architectural or product decisions that haven't been made yet. -->
<!-- These are the most expensive things to lose between sessions. -->

| Decision | Options Considered | Leaning Toward | Blocking? |
|----------|--------------------|----------------|-----------|
| Text editing implementation | `textarea` vs `contenteditable` | `textarea` for v1 simplicity/performance | No |
| Show Invisibles: overlay vs contenteditable swap | Overlay div (rAF sync) vs swap to contenteditable | Overlay div — more robust native behavior | No — decide in Phase 5 |

## Known Issues
<!-- Bugs, tech debt, or things that are broken but not urgent. -->

- None currently

## Environment & Setup
<!-- How to run this project. Critical for fresh agent sessions. -->

**Run locally:** Open `index.html` in browser (no build step). Or `python3 -m http.server 8787` for ES module support.
**Run tests:** `node test/run-node.js` (CLI) or open `test/test-runner.html` in browser.
**Deploy:** Planned static deployment on Netlify.
**Key env vars:** None expected for v1.

## Architecture Notes
<!-- Brief description of how the system is structured. -->
<!-- Link to more detailed docs if they exist. -->

Planned architecture is a single-page, client-only app (no server, no accounts, no external dependencies) with local state and preferences persisted via `localStorage`.

## Session Log
<!-- Brief log of recent sessions. Newest first. Delete entries older than 30 days. -->

### 2026-03-07 (session 2)
- **Goal:** Implement Phase 1 (TDD foundation) and start Phase 2
- **Accomplished:** Built test harness (browser + Node); wrote and passed 76 tests for history.js (12 tests) and cleaners.js (64 tests covering 16 cleaners); created cleaner registry pattern; started Phase 2 UI shell
- **Didn't finish:** Phase 2 in progress
- **Discovered:** Node runner with minimal DOM shim useful for fast CLI test feedback alongside browser harness

### 2026-03-07 (session 1)
- **Goal:** Plan v1 of Keen Bear text cleaning app
- **Accomplished:** Product spec finalized; v1 brainstorm completed; full 6-phase implementation plan written; plan deepened with research insights (architecture, performance, security, UX, testing, race conditions, regex safety); git repo initialized and pushed to GitHub
- **Didn't finish:** No implementation code yet
- **Discovered:** IME composition handling, clipboard secure-context requirements, and dual-threshold history policy are non-obvious requirements captured in the plan
