# Project Status
<!-- Updated: 2026-03-08 -->

## Project Overview
Keen Bear is a free, dark-mode-first text cleaning utility for the web where users paste plain text, run one-click cleaners, and get cleaned output locally in the browser with no account required.


## Current State
All 6 phases complete. GEO readiness pass done. Ready for Netlify deploy.

**Phase:** V1 complete + GEO optimized — ready for Netlify deploy
**Last Session:** 2026-03-08
**Last Session Summary:** GEO readiness audit and implementation — added structured data (WebApplication + FAQPage JSON-LD), collapsible FAQ section, robots.txt, llms.txt, sitemap.xml, netlify.toml, OG/Twitter Card tags, and canonical URL.

## What's Working
- Product specification: `keenbear-spec.md`
- V1 brainstorm: `docs/brainstorms/2026-03-07-keenbear-v1-brainstorm.md`
- Deepened implementation plan: `docs/plans/2026-03-07-feat-keenbear-v1-text-cleaning-app-plan.md`
- Git initialized with remote `git@github.com:adamprime/keenbear.git`
- **Test harness:** `test/test-runner.html` (browser) + `test/run-node.js` (Node CLI) — 99 tests all green
- **`js/history.js`:** Index-based undo/redo stack — 20-level depth, no-op dedupe (14 tests)
- **`js/cleaners.js`:** 16 cleaner functions with registry pattern (64 tests)
- **`js/find-replace.js`:** Pattern compilation, match counting, replace all with regex safety (21 tests)
- **`js/ui.js`:** Full UI wiring — cleaners, toolbar, shortcuts, filter, find/replace panel, show invisibles
- **`js/app.js`:** Entry point with service worker registration
- **`index.html` + `style.css`:** Two-panel layout, dark/light themes, responsive mobile bottom sheet
- **PWA:** manifest.json + service worker for offline/installable support
- **GEO/SEO:** JSON-LD (WebApplication + FAQPage), robots.txt, llms.txt, sitemap.xml, netlify.toml, OG + Twitter Card meta, canonical URL
- **FAQ:** 8-item collapsible "About & FAQ" section below the fold with flavor-aware styling

## What's In Progress
<!-- Active work items. Update every session. -->

| Item | Status | Branch | Notes |
|------|--------|--------|-------|
| Phase 1: Foundation + Core Cleaners | Complete | feat/phase-1-foundation-core-cleaners | 78 tests |
| Phase 2: HTML Shell + Styling | Complete | feat/phase-1-foundation-core-cleaners | Dark/light themes, responsive |
| Phase 3: UI Wiring + Interactivity | Complete | feat/phase-1-foundation-core-cleaners | All features wired |
| Phase 4: Find & Replace | Complete | feat/phase-1-foundation-core-cleaners | Regex + safety guards |
| Phase 5: Show Invisibles | Complete | feat/phase-1-foundation-core-cleaners | Overlay approach |
| Phase 6: Polish + PWA | Complete | feat/phase-1-foundation-core-cleaners | Manifest + service worker |
| GEO Readiness | Complete | main | Structured data, FAQ, crawler access, OG tags |

## What's Next
<!-- Prioritized backlog. Top item = next thing to work on. -->

1. **Deploy to Netlify** — static site, connect to keenbear.com (netlify.toml ready)
2. **Generate proper favicon** — extract bear head from mascot image for 32x32 / 16x16
3. **My Scrub** — chained cleaner feature (v2)

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

**Run locally:** `python3 -m http.server 8787` then open http://localhost:8787 (ES modules require a server).
**Run tests:** `node test/run-node.js` (CLI) or open `test/test-runner.html` in browser via server.
**Deploy:** Planned static deployment on Netlify.
**Key env vars:** None expected for v1.

## Architecture Notes
<!-- Brief description of how the system is structured. -->
<!-- Link to more detailed docs if they exist. -->

Planned architecture is a single-page, client-only app (no server, no accounts, no external dependencies) with local state and preferences persisted via `localStorage`.

## Session Log
<!-- Brief log of recent sessions. Newest first. Delete entries older than 30 days. -->

### 2026-03-08 (session 4)
- **Goal:** GEO readiness audit and implementation
- **Accomplished:** Ran full 6-dimension GEO audit (scored 24/100 pre-work). Implemented all 7 priority actions: fixed OG tags with absolute URLs + Twitter Cards, added JSON-LD structured data (WebApplication + FAQPage), created robots.txt with AI search/training crawler rules, llms.txt, sitemap.xml, netlify.toml with security headers, canonical URL, meta author. Built collapsible 8-item FAQ section with flavor-aware styling. OG image created (og-image.png). Service worker bumped to v3.
- **Didn't finish:** Netlify deploy, favicon extraction
- **Discovered:** GEO audit methodology — FAQPage schema + on-page FAQ content is the highest-impact GEO signal for utility apps

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
