---
title: "refactor: App optimization bundle (correctness, caching, structure, perf)"
type: refactor
status: active
date: 2026-04-07
deepened: 2026-04-07
origin: null  # No upstream brainstorm — derived from in-conversation code review on 2026-04-07
---

# refactor: App optimization bundle (correctness, caching, structure, perf)

## Deepening Summary

**Deepened on:** 2026-04-07
**Research agents used:** stripEmojis regex, SW caching strategies, extractFromHTML pure impl, invisibles overlay perf, JS module splitting, plan correctness review

### Factual Corrections
1. **`style.css` is NOT missing from `sw.js` ASSETS.** The plan's Problem Frame, R3, and Unit 1.4 incorrectly claim it is. It is present at line 5 of `sw.js`. Unit 1.4 should be reduced to a cache version bump only.
2. **`handlePasteEvent` bypasses `applyTextChange`.** The plan claims a single mutation seam but paste events directly modify `textarea.value` and call `history.push` independently (lines 376-393 of `ui.js`). The refactor should either route paste through `applyTextChange` or explicitly document this as a second mutation path.
3. **`stripEmojis` regex is more complex than described.** The plan says it uses `\p{Emoji}`. The actual regex is `\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Component}(?!\d)` — it already has a `(?!\d)` lookahead but still fails on `#` and `*`.
4. **Line numbers off:** `renderInvisibles` is at line 412 (not 399), `syncScroll` at line 443 (not 431).
5. **`sw.js` ASSETS update is missing from Unit 3.4's file list.** When `ui.js` moves to `ui/index.js`, `sw.js` must update its `/js/ui.js` entry.

### Key Research Improvements
1. **stripEmojis: Use emoji-regex-xs pattern instead of `\p{Extended_Pictographic}`.** The plan's D1 proposal has critical gaps: misses keycap emoji (1️⃣), flags (🇺🇸), orphans skin tone modifiers. The emoji-regex-xs pattern (~200 bytes) handles all emoji types atomically in a single pass with no ZWJ cleanup needed.
2. **extractFromHTML: Add `<br>`/block element → newline conversion and `<script>`/`<style>` stripping.** Without these, block structure collapses to a single line and CSS rules leak as visible text. Map `&nbsp;` to regular space, not `\u00A0`.
3. **SW: Use message-based `skipWaiting` + "new version available" notification** instead of unconditional `skipWaiting()`. Prevents mixed old+new asset race condition. ~20 lines of JS + a hidden banner.
4. **Invisibles: Add `requestIdleCallback` debouncing, `contain: strict` CSS, `replaceChildren()`, and `cloneNode(true)` templates** to the performance toolkit. Consider a hard cap (~500KB) where invisibles auto-disable.
5. **Module split: `sw.js` ASSETS update is the #1 risk.** Must replace `/js/ui.js` with all 7 new paths. Consider `modulepreload` hints in `index.html` (nice-to-have). Use setter functions for shared `let` state across modules.

## Overview

A phased optimization pass on Keen Bear V1.5 covering three independent but related areas:

1. **Correctness bug fixes** — small, low-risk fixes for cleaners and the offline asset manifest.
2. **Service worker caching overhaul** — change the update strategy so users don't get stuck on stale builds and offline parity is complete.
3. **`ui.js` structural refactor + interactive perf** — split the 563-line UI module into focused pieces and remove the per-keystroke costs that hurt large pastes.

The work is sequenced so each phase can ship independently and so risk increases monotonically: Phase 1 is shippable today, Phase 2 affects all users on next deploy, Phase 3 is a structural refactor with no intended behavior change.

## Problem Frame

Keen Bear V1.5 is feature-complete and deployed at keenbear.com. A code-review pass surfaced a cluster of issues that the test suite did not catch and that will only get worse as feature surface grows:

- Two cleaners produce incorrect output on common inputs (`stripEmojis` mangles digits/`#`/`*`; `extractFromHTML` round-trips through `textarea.innerHTML`, which is brittle for inputs with stray `<`).
- The service worker (`sw.js v5`) is **cache-first with no revalidation** ~~and its asset manifest is **missing `style.css`**~~ — (**CORRECTION:** `style.css` IS present in the ASSETS array; the manifest is complete but the caching *strategy* is the problem) online users can be pinned to a stale JS bundle indefinitely with no mechanism to receive updates.
- `js/ui.js` has grown to 563 lines and conflates DOM, theme strings, keyboard shortcuts, find/replace wiring, the invisibles overlay, and mobile sheet logic. It also re-renders the invisibles overlay (one DOM node per character) on every keystroke when active, which janks on large pastes — a common Keen Bear use case.

The work is internal-quality oriented. Users don't get new features, but they get correct cleaners, reliable updates, complete offline support, and a UI that doesn't stutter on big pastes.

## Requirements Trace

- **R1.** `stripEmojis` must not remove ASCII digits, `#`, or `*` from input that contains no actual emoji.
- **R2.** `extractFromHTML` must correctly handle inputs containing stray `<` characters and HTML entities, in both browser and Node test runners.
- **R3.** The service worker manifest must include every asset required to render the app offline. ~~(notably `style.css`)~~ (**CORRECTION:** `style.css` is already present. R3 is satisfied for the current manifest but must be re-verified after the Phase 3 module split adds new file paths.)
- **R4.** A new deploy must reach existing users on the **next page load** (not "two loads later" or "after a hard refresh"), without breaking offline support.
- **R5.** `js/ui.js` must be split into focused modules each with a single responsibility, preserving every existing behavior and keyboard shortcut.
- **R6.** With "Show Invisibles" enabled, typing into a 100KB+ textarea must not block the main thread for more than one frame per keystroke.
- **R7.** All 143 existing tests continue to pass; new tests cover every newly-fixed bug and every new module boundary that contains logic.
- **R8.** Zero new runtime dependencies. No build step. No framework. (`AGENTS.md` non-negotiables.)
- **R9.** `TESTING_GUIDE.md` is updated for every new test added (per `~/.claude/CLAUDE.md` TDD rule).

## Scope Boundaries

**In scope:**
- Cleaner correctness fixes for `stripEmojis`, `extractFromHTML`, `stripURLs` (trailing punctuation), `fixPunctuationSpacing` (closing quotes/brackets).
- ~~Adding `style.css` to the SW manifest~~ (already present), switching update strategy, version bump strategy, update notification banner.
- Splitting `ui.js` into modules; moving `FLAVORS` data out; making `renderInvisibles` and `updateStatus` non-blocking on large input.

**Out of scope (explicit non-goals):**
- New cleaners or new features. No UX changes visible to the user beyond the bug fixes.
- Switching to a build step, bundler, or TypeScript.
- Adding telemetry, analytics, or "recently used" sorting (recorded as future work).
- Web Worker offload for cleaner execution. Documented as a deferred follow-up.
- A Content Security Policy header in `netlify.toml`. Worth doing but out of this plan's scope.
- History storage optimization (diffs vs. snapshots). Current 20-level full-snapshot model is fine until tests show otherwise.
- `stripLeadingIndentation` tab/space normalization. Recorded as future work; not blocking.
- A keyboard-shortcut decoupling (`shortcut` field on cleaners) — recorded as future work.

## Context & Research

### Relevant Code and Patterns

- **`js/cleaners.js`** — pure `(text, options?) => text` registry pattern. All fixes must preserve the contract; the cleaner array order also drives Alt+1-9 muscle memory, so do not reorder it as part of this plan.
- **`js/ui.js`** — central `applyTextChange(run, source)` mutation point (line 41). Every text change in the app routes through it, including history push, status update, and invisibles re-render. Any refactor must preserve this single seam.
- **`js/ui.js:399` — `renderInvisibles`** — currently builds one DOM node per character. Re-runs from the `input` event handler (line 542) on every keystroke when invisibles is active. Confirmed perf hot path.
- **`js/ui.js:431` — `syncScroll`** — uses an always-on `requestAnimationFrame` loop while invisibles is active, regardless of whether scroll changed. Wasted wake-ups; trivial fix as part of the perf phase.
- **`js/ui.js:255` — `updateStatus`** — runs `text.trim().split(/\s+/)` on every keystroke. Fine for normal input, expensive for large pastes.
- **`js/history.js`** — clean class with `#states` private field, full snapshots. No changes proposed; documented here so the refactor doesn't accidentally couple to it.
- **`js/find-replace.js`** — `compilePattern` is recompiled on each `updateMatchCount` keystroke. Acceptable; out of scope.
- **`sw.js`** — 37 lines, hardcoded `keenbear-v5`, cache-first only, missing `style.css`. Both bugs live here.
- **`test/run-node.js`** — provides a minimal DOM shim with hand-rolled HTML entity decoding so `extractFromHTML` can run under Node. **Constraint:** any rewrite of `extractFromHTML` must remain testable in this Node runner; switching to `DOMParser` will require either extending the shim or removing the DOM dependency from the cleaner entirely. The plan chooses the latter (see Decision D2).
- **`test/cleaners.test.js`** — pattern: import the cleaner, `describe(name, () => { it(case, () => assert.equal(...)) })`. New tests follow the same shape; no framework dependency to add.

### Institutional Learnings

- **`docs/solutions/ui-bugs/mac-alt-number-keyboard-shortcuts.md`** — On macOS, holding Option composes special characters before the browser event fires, so Alt+number handlers must use `e.code` (not `e.key`). The current `handleKeydown` already uses `e.code` for `Digit0`–`Digit9`. **Apply to refactor:** when `keyboard.js` is extracted, this convention must be carried forward and reasserted in a comment, because it is a load-bearing decision that is not self-evident from the code.

### External References

- Skipped per Phase 1.2 of the planning workflow. Codebase has strong local patterns, no new frameworks involved, and the technology surface (vanilla JS, service worker) is well known. The one place external docs would help is the SW caching strategy, but the strategy chosen (stale-while-revalidate for shell, cache-first for images) is the standard MDN-documented pattern and does not warrant a research agent for this plan's scope.

## Key Technical Decisions

- **D1. `stripEmojis` switches to the emoji-regex-xs pattern (adapted, inlined).** ~~Originally proposed `\p{Extended_Pictographic}` + ZWJ cleanup.~~
  *Rationale:* `\p{Extended_Pictographic}` alone has critical gaps: misses keycap sequences (1️⃣), flag sequences (🇺🇸, which use Regional Indicators not in ExtPict), and orphans skin tone modifiers and tag characters. The emoji-regex-xs pattern (MIT licensed, ~200 bytes, 115k npm dependents) handles ALL emoji types atomically in a single regex pass — no separate ZWJ cleanup needed.

  *Pattern (compile once at module scope):*
  ```js
  const _base = String.raw`\p{Emoji}(?:\p{EMod}|[\u{E0020}-\u{E007E}]+\u{E007F}|\uFE0F?\u20E3?)`;
  const _emojiRe = new RegExp(
    String.raw`\p{RI}{2}|(?![#*\d](?!\uFE0F?\u20E3))${_base}(?:\u200D${_base})*`,
    'gu'
  );
  ```

  *How it works:* `\p{RI}{2}` catches flags. The negative lookahead `(?![#*\d](?!\uFE0F?\u20E3))` preserves bare digits/`#`/`*` while still stripping keycap emoji like 1️⃣. The rest handles ZWJ chains, skin tones, and tag sequences atomically. Browser support: all evergreen browsers since 2020 (Chrome 64+, Firefox 78+, Safari 11.1+).

  *Edge cases to note:* `©` and `®` are stripped (have `Emoji` property). `♡` is preserved (no `Emoji` property). This is generally the desired behavior for "strip emoji."

- **D2. `extractFromHTML` becomes pure (no DOM) and decodes entities inline.**
  *Rationale:* The current `textarea.innerHTML = ...` approach is fragile (re-parses stray `<`), forces a DOM shim in the Node test runner, and is the only cleaner that breaks the "pure function" contract. Replacing it with a small entity map (already prototyped in the Node shim) makes the cleaner pure, removes the DOM dependency, and lets us delete the shim. Numeric entities (`&#39;`, `&#x27;`) must be supported in addition to the named entities the shim already handles. This is a small, well-bounded function.

  ### Research Enhancement: extractFromHTML Implementation Details

  **Entity decoder:** Single regex pass matching `&(name);`, `&#(decimal);`, `&#x(hex);` — resolved via a ~35 entry named map + `String.fromCodePoint()` for numeric/hex. Single-pass avoids the XSS bug where multi-pass decoding converts `&amp;#60;` to `<`. Unknown named entities pass through unchanged.

  **Essential named entities (~35, covers >99% of pasted HTML):**
  - XML core 5: `amp`, `lt`, `gt`, `quot`, `apos`
  - Spaces: `nbsp` (→ regular space U+0020, not `\u00A0`), `ensp`, `emsp`, `thinsp`
  - Dashes: `ndash`, `mdash`
  - Quotes: `lsquo`, `rsquo`, `ldquo`, `rdquo`, `sbquo`, `bdquo`, `laquo`, `raquo`
  - Punctuation: `bull`, `hellip`, `middot`, `prime`, `Prime`
  - Symbols: `copy`, `reg`, `trade`, `euro`, `pound`, `cent`, `deg`, `sect`, `para`, `micro`
  - Math: `times`, `divide`, `plusmn`, `frac12`, `frac14`, `frac34`
  - Zero-width: `zwj`, `zwnj`

  **Additional pre-passes (not in original plan):**
  1. **Strip `<script>` and `<style>` blocks entirely** (content + tags) before general tag stripping. Without this, CSS rules leak as visible text when pasting from web pages: `text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')`
  2. **Strip HTML comments:** `text.replace(/<!--[\s\S]*?-->/g, '')`
  3. **Convert `<br>` → `\n` and block elements (`<p>`, `<div>`, `<h1-6>`, `<li>`, `<tr>`, `<blockquote>`) → `\n`** before stripping remaining tags. Without this, all block structure collapses to a single line, which is rarely what the user wants.

  **`&nbsp;` mapping:** Map to regular space `' '` (U+0020), not non-breaking space `\u00A0`. A text cleaning tool should produce clean text — `\u00A0` causes subtle bugs in downstream processing.

- **D3. Service worker switches to "stale-while-revalidate for shell, cache-first for images, network-first for nothing."**
  *Rationale:* Keen Bear is a static-asset PWA. The shell (HTML/CSS/JS) needs to update reliably without breaking offline. Stale-while-revalidate gives users an instant load from cache and quietly fetches the fresh version in the background, so they get the new build on the **second** load — at most one stale render. Combined with `clients.claim()` (already present) and a precache step that always loads the new manifest on `install`, users on a stale tab still get the update on next refresh. Pure-cache-first would be wrong because it strands users on old builds; pure network-first would break offline.

  ### Research Enhancement: Service Worker Strategy Details

  **Critical change: Remove unconditional `skipWaiting()` from install.** The current `self.skipWaiting()` in the install handler creates a race condition where a new SW activates immediately, potentially serving a mix of old (HTML from page load) and new (JS/CSS from new SW) assets. Replace with **message-based skipWaiting:**

  ```js
  // In sw.js — remove self.skipWaiting() from install, add:
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
  ```

  ```js
  // In app.js — detect waiting SW, show update banner:
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(newWorker); // "New version available — click to refresh"
        }
      });
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload(); // Atomic reload with all-new assets
  });
  ```

  **"New version available" notification:** Strongly recommended. Without it, SWR silently updates the cache and users get new content on their second visit — but if they keep a tab open, they run stale code indefinitely. A small toast/banner (~20 lines of JS + a hidden banner in HTML) fully solves the "two refresh" problem.

  **Separate caches:** Use `keenbear-shell-vN` for HTML/JS/CSS and `keenbear-images-vN` for images. This allows independent versioning and simpler cache cleanup.

  **Netlify-specific notes:** Netlify serves static assets with `Cache-Control: public, max-age=0, must-revalidate` by default. This means SWR's network fetch always gets fresh content from Netlify's CDN. No custom headers needed. Netlify deploys are atomic — no risk of partial deploy.

  **Cache key matching:** Default `caches.match()` uses the full URL. Ensure both `/` and `/index.html` are cached (or use `{ ignoreSearch: true }` if query strings are ever appended).

- **D4. SW cache version derives from a single constant at the top of `sw.js`, bumped per release.**
  *Rationale:* No build step exists, so we cannot inject a hash. A manual constant is the simplest reliable signal and matches the `v5` pattern already used. Document the bump rule in `AGENTS.md` so future changes don't drop it.

- **D5. `ui.js` splits into five modules along behavior boundaries, not artificial size buckets.**
  *Rationale:* The seam already exists in the section headers. The split mirrors the section dividers in the file:
  - `js/ui/dom.js` — element references and `applyTextChange` central mutation seam.
  - `js/ui/theme.js` — flavor + light/dark theming. Imports `flavors.js`.
  - `js/ui/flavors.js` — pure data: the `FLAVORS` object. No logic.
  - `js/ui/keyboard.js` — `handleKeydown`, including the `e.code` Mac convention comment.
  - `js/ui/invisibles.js` — overlay rendering, `syncScroll`, perf debouncing.
  - `js/ui/find.js` — find/replace panel wiring.
  - `js/ui/index.js` — re-exports `init()` so `app.js` import path stays `./ui.js` via a one-line shim, OR `app.js` is updated to import `./ui/index.js`. Decision deferred to implementation; both are one-line changes.
  *Rationale for not extracting more aggressively:* the mobile sheet and toolbar handlers are small enough to live in `dom.js` or `index.js`. Premature splitting hurts more than it helps.

  ### Research Enhancement: Module Split Implementation Details

  **Circular dependency prevention:** Enforce a strict DAG (Directed Acyclic Graph) import flow:
  ```
  flavors.js (pure data, zero imports)
       ↓
  theme.js (imports flavors.js)
       ↓
  dom.js (the "hub" — imports from ../history.js, ../cleaners.js, ../find-replace.js ONLY)
       ↓
  keyboard.js, invisibles.js, find.js (import from dom.js, never from each other)
       ↓
  index.js (imports all, exports init())
  ```
  **Rule:** `dom.js` must ONLY import from outside `ui/`. Document this constraint in a comment at the top of `dom.js`. If `dom.js` ever imports from a sibling module, Node ES modules will surface a confusing partial-export TDZ error.

  **Shared mutable state:** The current `ui.js` has `let lastActionWasCleaner`, `let composing`, `let invisiblesActive`, `let rafId`. These must live in `dom.js` (the hub). Since `export let` only allows reassignment from the declaring module, use **setter functions** (e.g., `export function setLastActionWasCleaner(v) { lastActionWasCleaner = v; }`) or wrap in an object: `export const state = { lastActionWasCleaner: false }` (siblings can mutate properties directly).

  **`init()` cross-module wiring:** The `textarea` `input` event handler (line 542-546 in current `init()`) calls `updateStatus()`, `updateMatchCount()`, and `renderInvisibles()` directly — NOT through `applyTextChange`. After the split, `init()` in `index.js` must import these from `dom.js`, `find.js`, and `invisibles.js` respectively. This is a concrete wiring point to verify.

  **Remove the shim — don't keep `js/ui.js`.** Since only `js/app.js` imports `js/ui.js`, change the import in `app.js` to `'./ui/index.js'`. A one-line re-export shim adds an unnecessary file and potential cache confusion. The plan already notes this as "implementer's choice" — research recommends the cleaner option.

  **SW ASSETS update (CRITICAL — #1 risk of the split):** `sw.js` currently lists `/js/ui.js` in the ASSETS array. After the split, this must be replaced with all 7 new module paths. If this is missed, existing users' service workers will try to serve the old cached `ui.js`, then the sub-module fetches will miss the cache and either go to network (online) or fail (offline). **Add `sw.js` to Unit 3.4's file list.**

  **`modulepreload` hints (nice-to-have):** Add `<link rel="modulepreload" href="/js/ui/dom.js">` etc. to `index.html` for the sub-modules. This eliminates the 1-level waterfall on first cold load (browser can't discover sub-modules until it fetches `index.js`). Marginal benefit since SW caches all assets after first visit, but it's free. All modern browsers support `rel="modulepreload"` (Chrome 66+, Firefox 115+, Safari 17+).

  **Module evaluation order:** DOM refs (`document.getElementById(...)`) execute at module evaluation time. ES modules are always deferred, so this is safe as long as the `<script type="module">` is in `<body>`. Verified: `index.html` has `<script type="module" src="js/app.js"></script>` at the end of `<body>`. No issue.

- **D6. Invisibles re-rendering moves to "one span per run" batched rendering, debounced with `requestIdleCallback`.**
  *Rationale:* The current implementation creates one `<span>` per character. For a 100KB paste that's 100k DOM nodes per keystroke. ~~Originally proposed a single `textContent` assignment.~~ Research confirms CSS-only approaches are not viable for character-level invisible markers — JavaScript DOM rendering is required.

  ### Research Enhancement: Invisibles Performance Toolkit (priority order)

  | Priority | Technique | Impact | Complexity |
  |----------|-----------|--------|------------|
  | 1 | **"One span per run" rendering** — group consecutive visible chars into a single text node, only create `<span>` for invisible markers | ~5-10× fewer DOM nodes | Low |
  | 2 | **`replaceChildren(frag)`** instead of `textContent = '' + appendChild()` | ~10-20% faster DOM update | Trivial |
  | 3 | **`requestIdleCallback` debounce** on input event (fall back to `setTimeout(fn, 0)` for Safari <16.4) | Eliminates typing lag — rIC is superior to rAF because it naturally adapts to device speed and batches rapid keystrokes | Low |
  | 4 | **Passive scroll event listener** (replace rAF polling) | Saves CPU/battery, prevents leaked animation loops | Low |
  | 5 | **`contain: strict` CSS** on overlay element | Free layout/paint optimization — tells browser rendering changes inside overlay can't affect outside | Trivial |
  | 6 | **`cloneNode(true)` for marker spans** — pre-create template spans at module scope | ~5-10% faster element creation vs createElement+set each time | Low |
  | 7 | **Size cap with auto-disable** (~500KB) with status message | Prevents browser hang on huge pastes | Low |

  *How code editors do it:* CodeMirror 6 uses a `MatchDecorator` that only processes visible ranges with incremental updates. Monaco uses GPU canvas rendering. Both are far more complex than needed here. The "one span per run" approach is the right balance for Keen Bear's scope.

  *CSS enhancement:* Add `contain: strict` and `pointer-events: none` (likely already present) to the overlay. `pointer-events: none` actually improves Chrome's scroll compositing by preventing hit-test recalculations. Consider `will-change: scroll-position` on the overlay as a compositor layer hint.

  *Future escalation path (out of scope):* If "one span per run" + rIC isn't enough, the next step is `content-visibility: auto` on line-level `<div>`s (~45% improvement per Nolan Lawson's measurements), then full windowed/virtual rendering.

- **D7. `syncScroll` switches from an always-on RAF loop to a `scroll` event listener.**
  *Rationale:* The textarea fires `scroll` events; there is no reason to wake the main thread 60 times a second when nothing is scrolling. The current loop only exists because `scroll` event-based sync was probably tried first and had a flicker, but a scroll-event listener with `{ passive: true }` is the standard approach and matches what the textarea actually does. Research confirms the 1-frame lag concern is typically imperceptible. Adding `will-change: scroll-position` or `overflow: hidden` on the overlay (since it's programmatically scrolled) can help the browser promote it to its own compositor layer.

- **D8. `updateStatus` debounces to `requestAnimationFrame` when the input is large.**
  *Rationale:* Counts are visual feedback, not load-bearing state. A one-frame delay on a 1MB textarea is invisible to users and avoids re-trimming and re-splitting per keystroke. Small inputs continue to update synchronously so the test harness and the small-input UX feel unchanged.

- **D9. (NEW) `handlePasteEvent` should route through `applyTextChange` or be explicitly documented as a second mutation path.**
  *Rationale:* The plan states "Every text change in the app routes through `applyTextChange`" but this is factually incorrect — `handlePasteEvent` (lines 376-393 of `ui.js`) directly modifies `textarea.value` and calls `history.push`, `updateStatus`, `updateUndoRedoButtons`, and `renderInvisibles` independently. During the Phase 3 module split, each of these cross-module calls must be maintained. The cleanest fix is to refactor `handlePasteEvent` to use `applyTextChange` with a selection-aware variant, or if that's too disruptive, add a comment in `dom.js` explicitly documenting both mutation paths so future module additions don't silently miss one.

## Open Questions

### Resolved During Planning

- **Should we also tackle history-as-diffs?** No — current snapshot model is fine until we have evidence it's a problem. Recorded as future work.
- **Should the SW cache version be derived from a hash?** No — there's no build step. A manual constant is simplest and matches the existing `v5` pattern. (D4)
- **Will the new `extractFromHTML` regress on existing tests?** No — the existing entity decoder in `test/run-node.js` only handles 5 named entities. The new pure implementation must support at least the same set plus numeric/hex entities, which means the existing tests are a strict subset and will continue to pass. New tests cover the additional cases.
- **Do we need a CSP for paste safety?** Worth doing, but out of scope. Recorded under Future Considerations.
- **Should `ui.js` move under a `js/ui/` directory or stay flat?** Move under `js/ui/`. Mirrors the existing `js/` organization and signals "this is a subsystem with multiple files."

### Deferred to Implementation

- **Exact CSS strategy for invisible markers in the new `renderInvisibles`** — depends on whether single-`textContent` rendering loses the per-glyph color treatment. The implementer should try the single-string approach first, visually compare against `Show Invisibles` on a paragraph with mixed spaces/tabs/newlines, and fall back to the run-based span model only if the comparison loses signal.
- **Whether `app.js` updates its import to `./ui/index.js` or whether `ui.js` becomes a one-line re-export shim.** Either is fine; pick whichever produces a smaller diff at implementation time.
- **The exact threshold for "large input" in `updateStatus` debouncing.** Pick a value (e.g., 50 KB) at implementation time after measuring on the test machine. Document the choice with a comment.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Phase 1 (correctness)
─────────────────────
js/cleaners.js              ── stripEmojis: \p{Extended_Pictographic} + ZWJ
                            ── extractFromHTML: pure, entity map, no DOM
                            ── stripURLs: trim trailing .,;:!?)
                            ── fixPunctuationSpacing: handle ", ' ) ] }
test/cleaners.test.js       ── new cases for each fix above
test/run-node.js            ── delete the `document` shim block
sw.js                       ── add '/style.css' to ASSETS, bump to v6

Phase 2 (service worker)
────────────────────────
sw.js  v6 → v7
  install  : precache full asset list (now correct)
  activate : delete old caches (unchanged)
  fetch    : if request is for shell asset (HTML/JS/CSS) →
               stale-while-revalidate
             else if image/font →
               cache-first with cache-fill on miss
             else →
               passthrough to network
AGENTS.md                   ── add "bump CACHE_NAME on every deploy that
                                changes a cached asset" to conventions

Phase 3 (refactor + perf)
─────────────────────────
js/ui.js  →  js/ui/{dom, theme, flavors, keyboard, invisibles, find, index}.js
            ── pure data extracted (FLAVORS)
            ── e.code Mac convention re-asserted in keyboard.js comment
            ── invisibles render: single textContent / RAF debounced
            ── syncScroll: scroll-event listener, no RAF loop
            ── updateStatus: RAF-debounced for large input
js/app.js                   ── import path updated if needed (D5)
test/ui-invisibles.test.js  ── new: pure rendering function tested in isolation
test/ui-keyboard.test.js    ── new: e.code branch for Alt+1-9 / Alt+0
TESTING_GUIDE.md            ── new tests documented per repo TDD rule
docs/STATUS.md              ── refresh after each phase merge
```

## Implementation Units

### Phase 1 — Correctness Fixes

- [x] **Unit 1.1: Fix `stripEmojis` correctness**

**Goal:** `stripEmojis` no longer removes ASCII digits, `#`, or `*` while still removing all real emoji including ZWJ sequences and skin tone modifiers.

**Requirements:** R1, R7

**Dependencies:** None

**Files:**
- Modify: `js/cleaners.js` (`stripEmojis` only)
- Test: `test/cleaners.test.js` (new `describe` block additions)

**Approach:**
- Replace the current regex with the emoji-regex-xs pattern (see D1 above). Compile the regex once at module scope. Single pass — no follow-up ZWJ cleanup needed.
- Do not change the function signature or registry entry.

**Implementation sketch:**
```js
const _base = String.raw`\p{Emoji}(?:\p{EMod}|[\u{E0020}-\u{E007E}]+\u{E007F}|\uFE0F?\u20E3?)`;
const _emojiRe = new RegExp(
  String.raw`\p{RI}{2}|(?![#*\d](?!\uFE0F?\u20E3))${_base}(?:\u200D${_base})*`,
  'gu'
);

export function stripEmojis(text) {
  if (!text) return '';
  return text.replace(_emojiRe, '');
}
```

**Execution note:** Test-first. Add the failing cases (digits, `#`, `*`, mixed text-with-emoji, family ZWJ sequence, skin-tone modifier, flags, keycaps) before touching the implementation.

**Patterns to follow:** existing `stripEmojis` function in `js/cleaners.js` and the `describe`/`it` style in `test/cleaners.test.js`.

**Test scenarios:**
- `"call 911"` → unchanged (digits preserved)
- `"#hashtag *bold*"` → unchanged (`#` and `*` preserved)
- `"hi 👋 world"` → `"hi  world"`
- `"👨‍👩‍👧‍👦 family"` → `" family"` (ZWJ family removed atomically, no orphaned ZWJ)
- `"thumbs 👍🏽 up"` → `"thumbs  up"` (skin tone modifier removed with base emoji)
- `"flag 🇺🇸"` → `"flag "` (regional indicator pair removed — this FAILS with `\p{Extended_Pictographic}`)
- `"dial 1️⃣ now"` → `"dial  now"` (keycap emoji stripped, but bare `1` preserved — this FAILS with `\p{Extended_Pictographic}`)
- `"🏴󠁧󠁢󠁥󠁮󠁧󠁿 England"` → `" England"` (tag sequence flag removed cleanly)
- Empty string → empty string (existing test continues to pass)
- **Edge case:** `"© 2026"` → `" 2026"` (copyright sign has Emoji property — acceptable behavior, document it)

**Verification:**
- `node test/run-node.js` reports the new tests passing and all existing tests still green.
- Manual smoke test: paste a sentence with phone numbers and currency symbols into the deployed app with the cleaner; nothing other than emoji disappears.

---

- [x] **Unit 1.2: Make `extractFromHTML` pure and update tests**

**Goal:** `extractFromHTML` no longer touches the DOM, handles stray `<`, and supports numeric entities.

**Requirements:** R2, R7, R8

**Dependencies:** None

**Files:**
- Modify: `js/cleaners.js` (`extractFromHTML` only)
- Modify: `test/run-node.js` (delete the `globalThis.document` shim block)
- Test: `test/cleaners.test.js` (new cases)

**Approach:**
1. **Pre-pass: strip `<script>` and `<style>` blocks** (content + tags): `text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')`
2. **Pre-pass: strip HTML comments:** `text.replace(/<!--[\s\S]*?-->/g, '')`
3. **Convert block elements to newlines:** `<br>` → `\n`, `</p>`, `</div>`, `</h1-6>`, `</li>`, `</tr>`, `</blockquote>` → `\n`
4. **Strip remaining tags** with `<[^>]*>` regex (acceptable because this is "extract text from pasted HTML," not a sanitizer).
5. **Decode entities** inline using the ~35 named entity map (see D2 above) + numeric `&#(\d+);` + hex `&#x([0-9a-fA-F]+);` via `String.fromCodePoint()`. Single regex pass to avoid multi-pass XSS bug.
6. **Collapse excessive newlines:** `\n{3,}` → `\n\n` (same as `removeExtraReturns` does).
- Cleaner becomes a pure `(text) => text` function with no DOM dependency, restoring the contract every other cleaner already follows.
- Delete the Node test runner's `document` shim now that nothing needs it.

**Execution note:** Test-first.

**Patterns to follow:** Other pure cleaners in `js/cleaners.js` (`normalizeUnicode` is the closest analog — string-in, string-out, regex-replace pipeline).

**Test scenarios:**
- `"<p>Hello <b>world</b></p>"` → `"\nHello world\n"` or `"Hello world"` (depends on whether output is trimmed — consider `.trim()` at the end)
- `"&amp;&lt;&gt;&quot;&#39;"` → `"&<>\"'"`
- `"&#65;&#x42;"` → `"AB"` (numeric and hex entities)
- `"a < b and c > d"` → `"a < b and c > d"` (stray `<`/`>` survive — current implementation mangles this)
- `"<script>alert(1)</script>safe"` → `"safe"` (script block stripped entirely — improved from original plan's `"alert(1)safe"`)
- `"<style>.foo{color:red}</style>Hello"` → `"Hello"` (style block stripped entirely)
- `"<!-- comment -->visible"` → `"visible"` (comment stripped)
- `"<p>para one</p><p>para two</p>"` → `"para one\npara two"` (block structure preserved as newlines)
- `"line one<br>line two"` → `"line one\nline two"` (`<br>` → newline)
- `"&nbsp;&nbsp;indented"` → `"  indented"` (`&nbsp;` → regular space)
- Empty string → empty string

**Tag stripping edge cases (acceptable limitations):**
- `<div data-x="a<b">` (< in attribute) — may misparse. Extremely rare in pasted HTML; browsers normalize attributes before copy.
- Unclosed `<br` at end of string — left as text. Correct behavior for stray `<`.

**Verification:**
- All `extractFromHTML` tests pass under both `node test/run-node.js` and the browser harness.
- Search confirms no `document.` references remain in `js/cleaners.js`.

---

- [x] **Unit 1.3: Tighten `stripURLs` and `fixPunctuationSpacing` edges**

**Goal:** Both cleaners handle the trailing-punctuation and closing-quote/bracket cases that the current implementations miss.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Modify: `js/cleaners.js`
- Test: `test/cleaners.test.js`

**Approach:**
- `stripURLs`: after the existing replacement, strip a single trailing `.,;:!?)` that was left dangling where the URL used to end. Done with a lookbehind-free pattern that targets the gap.
- `fixPunctuationSpacing`: extend the negated character class so the rule does not fire when the next character is `"`, `'`, `)`, `]`, `}` (already-closing punctuation), and does fire after a closing quote followed by a letter.

**Execution note:** Test-first.

**Patterns to follow:** existing `stripURLs` and `fixPunctuationSpacing`.

**Test scenarios:**
- `"see https://example.com."` → `"see ."` becomes `"see ."` with the trailing period preserved exactly once, not absorbed by the URL strip
- `"call (555-1234) now"` → unchanged (no false positive)
- `'"hi,"he said'` → `'"hi," he said'`
- Existing tests for both cleaners continue to pass.

**Verification:**
- `node test/run-node.js` green on the expanded suite.

---

- [x] **Unit 1.4: ~~Add `style.css` to the SW manifest and~~ Bump cache version for Phase 1 changes**

**Goal:** ~~Offline users render the app with full styling.~~ Force existing users to pick up the Phase 1 cleaner fixes via a new cache version.

**CORRECTION:** `style.css` is already present in the `ASSETS` array (line 5 of `sw.js`). The original plan's claim that it was missing was factually incorrect. This unit is reduced to a cache version bump only.

**Requirements:** R3, R4

**Dependencies:** Units 1.1–1.3 (so the cache carries the fixed cleaners)

**Files:**
- Modify: `sw.js` (`CACHE_NAME` only)

**Approach:**
- Bump `CACHE_NAME` from `keenbear-v5` to `keenbear-v6`.
- Verify the ASSETS array is already complete (it is).

**Test scenarios:** (manual; no automated SW tests in this repo)
- Load the deployed app, hard-refresh to install the new SW, go offline (DevTools → Network → Offline), reload — app renders styled.
- Confirm via DevTools → Application → Cache Storage that `keenbear-v6` cache exists and contains all assets.

**Verification:**
- Offline reload of the app shows the Salty Octopus theme intact.
- No console errors.

---

- [x] **Unit 1.5: Update `TESTING_GUIDE.md` and `docs/STATUS.md` for Phase 1**

**Goal:** Repo TDD documentation rule stays satisfied; status reflects Phase 1.

**Requirements:** R9

**Dependencies:** Units 1.1–1.4

**Files:**
- Modify: `TESTING_GUIDE.md` (or create if it does not exist — repo CLAUDE.md asserts it should exist)
- Modify: `docs/STATUS.md`

**Approach:**
- For each new test added in 1.1–1.3, add a one-line entry under the appropriate cleaner section in `TESTING_GUIDE.md`.
- Update `docs/STATUS.md` "Last Session" block to reflect the Phase 1 merge.

**Verification:**
- `TESTING_GUIDE.md` lists every new test by name.
- `docs/STATUS.md` `Last Session` is dated 2026-04-07 (or the actual merge date) and references this plan.

---

### Phase 2 — Service Worker Caching Overhaul

- [ ] **Unit 2.1: Switch the SW fetch handler to stale-while-revalidate for shell assets**

**Goal:** Fresh deploys reach users on the next page load while preserving offline support.

**Requirements:** R4

**Dependencies:** Phase 1 merged (so the manifest is correct before changing the strategy)

**Files:**
- Modify: `sw.js`

**Approach:**
- Categorize requests in the `fetch` handler:
  - **Shell** (HTML, JS, CSS, manifest): respond from cache immediately if present, then update the cache from the network in the background. If not in cache, fall through to network and cache the result.
  - **Images / icons / og-image**: cache-first with cache-fill on miss. These rarely change and should not bust on every deploy.
  - **Everything else**: passthrough to network.
- Bump `CACHE_NAME` to `keenbear-v7` so the new strategy takes effect immediately on the next install.
- Keep `clients.claim()` and the old-cache cleanup in `activate` (already present).

**Technical design:** *(directional, not implementation specification)*

```
install:
    precache SHELL_ASSETS + IMAGE_ASSETS (ensures offline from first visit)
    DO NOT call skipWaiting() — use message-based activation (see D3)

activate:
    delete old caches not in [SHELL_CACHE, IMAGE_CACHE]
    clients.claim()

message:
    if event.data.type === 'SKIP_WAITING' → self.skipWaiting()

fetch(request):
    if not same-origin GET → passthrough
    if shell(request):  // HTML, JS, CSS, manifest
        cached = match(request)
        revalidate = fetch(request).then(response => {
            if response.ok → cache.put(request, response.clone())
            return response
        }).catch(() => null)  // network failure is fine — we have cache
        return cached ?? await revalidate
    if image(request):  // png, jpg, svg, ico, webp
        cached = match(request)
        return cached ?? fetch+cache(request)
    return fetch(request)
```

**Separate caches:** `keenbear-shell-v7` for HTML/JS/CSS and `keenbear-images-v7` for images. Independent versioning and simpler cleanup.

**Update notification in `app.js`:** Detect `updatefound` → `installed` state on new SW → show a small "New version available — [Refresh]" banner. On click, send `SKIP_WAITING` message to waiting SW. On `controllerchange`, `window.location.reload()` for atomic update. ~20 lines.

**Patterns to follow:** Existing `sw.js` install/activate handlers — keep the same single-file shape and avoid introducing helper modules. Service worker stays under 100 lines.

**Test scenarios:** (manual — service worker behavior is hard to unit-test in this repo and a test framework for it is out of scope)
- Deploy two consecutive builds with a visible CSS change. Confirm the second build appears on the second reload, not the third.
- Take the app offline after install, reload — full app loads with current cache.
- Modify a JS file locally, hard-refresh, confirm the change appears on the **next** soft reload without DevTools intervention.
- **New:** Verify the "New version available" banner appears after deploying a change. Clicking it reloads with new content.
- **New:** Verify no mixed-asset loading (all resources from same SW version) by checking Network tab after update.

**Verification:**
- Stale-build situation no longer reproducible without DevTools cache clearing.
- Offline support unchanged.

---

- [ ] **Unit 2.2: Document the SW version-bump rule in `AGENTS.md`**

**Goal:** Future contributors don't ship cache-busting changes without bumping `CACHE_NAME`.

**Requirements:** R4

**Dependencies:** Unit 2.1

**Files:**
- Modify: `AGENTS.md` (new bullet under Conventions)

**Approach:**
- Add a one-line rule: "Bump `CACHE_NAME` in `sw.js` for any deploy that changes a cached asset."
- Reference this plan as the source of the rule.

**Verification:**
- The rule is visible in `AGENTS.md` under Conventions.

---

### Phase 3 — `ui.js` Refactor and Interactive Perf

- [ ] **Unit 3.1: Extract `FLAVORS` data and theme logic into `js/ui/flavors.js` + `js/ui/theme.js`**

**Goal:** Reduce `ui.js` size and isolate the largest chunk of pure data so it's easy to add or change a flavor without scrolling through DOM code.

**Requirements:** R5, R8

**Dependencies:** None inside Phase 3

**Files:**
- Create: `js/ui/flavors.js` (export `FLAVORS` const)
- Create: `js/ui/theme.js` (export `initTheme`, `applyFlavor`, `toggleTheme`)
- Modify: `js/ui.js` (delete moved code, import from new files)

**Approach:**
- `flavors.js` is pure data: the `FLAVORS` object literal verbatim, no logic.
- `theme.js` keeps `setButtonLabel`, `applyFlavor`, `initTheme`, `toggleTheme`. It accepts the DOM references it needs as imports from `dom.js` (created in Unit 3.4) or via parameters; pick whichever produces the smaller diff at implementation time.
- Default flavor (`pirate`) and `localStorage` keys stay unchanged.

**Patterns to follow:** Other module files in `js/` use named exports and no default exports.

**Test scenarios:** (no new automated tests — pure structural move)
- Manual: cycle through every flavor in the deployed app and confirm tagline, placeholder, button tooltips, sidebar title, and filter placeholder all change correctly.
- Manual: refresh; the saved flavor is restored.

**Verification:**
- `js/ui.js` line count drops by ~80 lines.
- Every flavor still renders identically to before.
- All 143 existing tests still pass.

---

- [ ] **Unit 3.2: Rewrite `renderInvisibles` to be `requestAnimationFrame`-debounced and DOM-cheap**

**Goal:** Typing into a 100KB textarea with invisibles enabled stays under one frame per keystroke on the main thread.

**Requirements:** R6, R7

**Dependencies:** None inside Phase 3

**Files:**
- Create: `js/ui/invisibles.js` (extract `toggleInvisibles`, `renderInvisibles`, `syncScroll`, plus a new pure `renderInvisiblesString(text)` helper)
- Modify: `js/ui.js` (delete moved code, import from new file)
- Test: `test/ui-invisibles.test.js` (new file — covers the pure helper)

**Approach:**
- Split rendering into two layers:
  1. `renderInvisiblesNodes(text)` — pure function, returns a `DocumentFragment` using the "one span per run" strategy: consecutive visible characters become a single text node, invisible characters (`space`, `tab`, `newline`) get a `<span>` with the appropriate class and marker character. **Use pre-created template spans** (`cloneNode(true)`) for marker elements — measurably faster than `createElement` + set class + textContent each time.
  2. `renderInvisibles()` — DOM side: calls `invisiblesOverlay.replaceChildren(renderInvisiblesNodes(text))`. Use `replaceChildren()` instead of `textContent = '' + appendChild()` (~10-20% faster, atomic DOM update).
- Wrap `renderInvisibles` in a `requestIdleCallback` queue (with `setTimeout(fn, 0)` fallback for Safari <16.4): if a render is already pending, don't schedule another. rIC is superior to rAF for this use case because it naturally adapts to device speed and batches rapid keystrokes — the overlay is a visual aid, not load-bearing UI, so a small delay is acceptable.
- **Add `contain: strict` CSS** to the overlay element — free layout/paint optimization. Also ensure `pointer-events: none` is set (improves Chrome scroll compositing).
- **Add a size cap** (~500KB): auto-disable invisibles with a status message for very large pastes, preventing browser hang.
- Replace the always-on `syncScroll` RAF loop with a `textarea.addEventListener('scroll', ..., { passive: true })` listener that copies `scrollTop`/`scrollLeft` to the overlay. The 1-frame lag concern is typically imperceptible. Consider `will-change: scroll-position` on the overlay for compositor layer promotion.

**Execution note:** Test-first for the pure `renderInvisiblesString` helper. The DOM side is verified manually.

**Patterns to follow:** `js/cleaners.js` style for the pure helper. Existing `setupComposition()` style for the scroll listener.

**Test scenarios:**
- Pure helper: empty string → empty string.
- Pure helper: `"a b\tc\n"` → `"a·b→\tc¶\n"`.
- Pure helper: only-whitespace input → all marker characters.
- Pure helper: 10k-character input → completes in ≤ 5ms on the test machine (smoke check, not a strict assertion).
- Manual perf: paste 100KB into the textarea with invisibles on, type a character, observe no visible jank (≤ 16ms main-thread block in DevTools Performance).
- Manual visual: every space, tab, and newline marker still appears in the right place; turning invisibles off restores the plain textarea look.

**Verification:**
- New tests in `test/ui-invisibles.test.js` pass under `node test/run-node.js`.
- DevTools Performance trace on 100KB input shows no long task per keystroke.
- Toggling invisibles on and off has no console errors and no leftover DOM nodes.

---

- [ ] **Unit 3.3: Debounce `updateStatus` for large input and remove the always-on RAF loop**

**Goal:** Status bar counts no longer recompute synchronously on every keystroke for large pastes.

**Requirements:** R6

**Dependencies:** None

**Files:**
- Modify: `js/ui.js` (or `js/ui/dom.js` after Unit 3.4 lands, whichever order is implemented)

**Approach:**
- For inputs above a documented threshold (e.g., 50,000 characters), schedule `updateStatus` via `requestAnimationFrame` and coalesce repeats. Below the threshold, keep the synchronous behavior so the test harness and small-input UX feel unchanged.
- Confirm the `syncScroll` RAF loop is gone after Unit 3.2 lands (it is the other source of always-on RAF in `ui.js`).

**Test scenarios:** (manual)
- Type quickly into a 200KB textarea; status updates feel responsive but don't block typing.
- Type into an empty textarea; status updates feel immediate.

**Verification:**
- No `requestAnimationFrame` recursion remains in `ui.js` (or in any file under `js/ui/`).

---

- [ ] **Unit 3.4: Split the rest of `ui.js` into `dom.js`, `keyboard.js`, `find.js`, and `index.js`**

**Goal:** No file in `js/ui/` exceeds ~200 lines; each file has a single responsibility.

**Requirements:** R5, R8

**Dependencies:** Units 3.1–3.3 (so the moved code is already in its final shape)

**Files:**
- Create: `js/ui/dom.js` — element refs, `applyTextChange`, `updateStatus`, `updateUndoRedoButtons`, mobile sheet handlers, toolbar handlers. **Add a comment at the top documenting the DAG constraint: this module must only import from outside `ui/` (../history.js, ../cleaners.js, ../find-replace.js). Also document the `handlePasteEvent` second mutation path.**
- Create: `js/ui/keyboard.js` — `handleKeydown`, with a comment re-asserting the `e.code` Mac convention from `docs/solutions/ui-bugs/mac-alt-number-keyboard-shortcuts.md`
- Create: `js/ui/find.js` — find/replace panel wiring (`openFindPanel`, `closeFindPanel`, `updateMatchCount`, `handleReplaceAll`, etc.)
- Create: `js/ui/index.js` — re-exports `init()` so it can be imported as before
- **Delete: `js/ui.js`** and update `js/app.js` import to `'./ui/index.js'` directly (no shim — cleaner diff, avoids cache confusion)
- **Modify: `sw.js`** — replace `/js/ui.js` in ASSETS with all new module paths: `/js/ui/index.js`, `/js/ui/dom.js`, `/js/ui/theme.js`, `/js/ui/flavors.js`, `/js/ui/keyboard.js`, `/js/ui/invisibles.js`, `/js/ui/find.js`. Bump `CACHE_NAME`.
- **Consider: `index.html`** — add `<link rel="modulepreload">` hints for the sub-modules (nice-to-have, marginal benefit with SW cache)
- Test: `test/ui-keyboard.test.js` — new tests for the `e.code` branch

**Approach:**
- Move code in section-divider order. Each new file's imports are minimal: only the DOM refs and helpers it actually uses.
- `applyTextChange` stays in `dom.js` because every other module uses it as the central mutation seam.
- `keyboard.js` imports the cleaner registry from `js/cleaners.js` (same as today) and the `applyTextChange` seam from `dom.js`.
- `find.js` imports `compilePattern`, `countMatches`, `replaceAll` from `js/find-replace.js` (unchanged).
- New keyboard tests stub `document` minimally (similar to the old `extractFromHTML` shim being deleted in Unit 1.2 — but isolated to this test file, not a global runner mutation).

**Execution note:** This is the largest unit by line count but the lowest risk because it's a pure code move. Land after the perf and correctness changes so the structural diff is unambiguous.

**Patterns to follow:** Existing `js/` module style — named exports, ES module imports, no defaults, no classes unless replacing `History`-style state.

**Test scenarios:**
- Existing 143 tests continue to pass (`node test/run-node.js`).
- New `test/ui-keyboard.test.js` covers:
  - `e.code === 'Digit1'` with `altKey: true` triggers the first cleaner.
  - `e.code === 'Digit0'` with `altKey: true` toggles invisibles.
  - `e.key === '¡'` (Mac composed character) is **ignored** when `e.code` does not match a digit — guarding against the regression documented in `docs/solutions/ui-bugs/mac-alt-number-keyboard-shortcuts.md`.
  - `Cmd+F` opens the find panel.
  - `Escape` closes the find panel when open.

**Verification:**
- `wc -l js/ui/*.js` shows no file over ~200 lines.
- `node test/run-node.js` green.
- Manual smoke test: every keyboard shortcut from the README still works on Mac and Windows/Linux.
- Every flavor still renders correctly.
- Find & Replace still works with both literal and regex modes.
- Show Invisibles still works.

---

- [ ] **Unit 3.5: Update `TESTING_GUIDE.md`, `AGENTS.md`, `docs/STATUS.md`, and add a solution doc**

**Goal:** Repo documentation reflects the new module layout and the `e.code` rule, and the perf fix is recorded as a solution for future contributors.

**Requirements:** R9

**Dependencies:** Units 3.1–3.4

**Files:**
- Modify: `TESTING_GUIDE.md`
- Modify: `AGENTS.md` (Architecture / Module Responsibilities table — add the new files under `js/ui/`)
- Modify: `docs/STATUS.md`
- Create: `docs/solutions/ui-bugs/invisibles-overlay-perf.md` (frontmatter + Problem / Root Cause / Fix sections, mirroring the existing `mac-alt-number-keyboard-shortcuts.md` solution doc)

**Approach:**
- Mirror the existing solution doc shape exactly. Include before/after numbers from a manual Performance trace if available.
- Update the Module Responsibilities table in `AGENTS.md` to list the seven `js/ui/*.js` files instead of the single `js/ui.js` row. Keep the rest of the table identical.

**Verification:**
- `AGENTS.md` table accurately describes the new layout.
- Solution doc is discoverable via `ls docs/solutions/ui-bugs/`.
- `docs/STATUS.md` `Last Session` block is current.

## System-Wide Impact

- **Interaction graph:** The `applyTextChange` seam in `dom.js` is the only place text mutations occur. Every callsite (toolbar handlers, cleaner click handlers, keyboard shortcuts, find/replace, paste event) routes through it. The Phase 3 refactor must preserve this — if any callsite ends up bypassing the seam, history tracking and the invisibles re-render trigger silently break for that path.
- **Error propagation:** No new error paths. The pure `extractFromHTML` cannot throw (regex-only). The new `renderInvisiblesString` cannot throw. The SW changes don't add new failure modes; if `fetch` rejects in stale-while-revalidate, the cached version is still returned and the rejection is swallowed (intentional — we don't want background failures to surface to users).
- **State lifecycle risks:**
  - SW cache version bump means the **entire** old cache is dropped on activate. This is intentional and matches the existing `v5` behavior, but it means a user with a poor connection during activation will briefly see network requests rather than instant cache hits. Acceptable.
  - The invisibles overlay holds a reference to a string (or a small node tree). It's recreated on every render — no leak risk.
- **API surface parity:** No public API. Single deploy target. `js/cleaners.js` remains importable as before; `js/app.js` import path change (if any) is internal.
- **Integration coverage:** The cleaner unit tests cover individual functions; the new `test/ui-invisibles.test.js` and `test/ui-keyboard.test.js` cover the pure helpers extracted from `ui.js`. The "everything wired together" path is still covered by manual smoke tests at deploy time — formalizing browser-level integration tests is out of scope.

## Risks & Dependencies

- **R-1: Phase 2 cache strategy regression.** A miswritten stale-while-revalidate handler could leave users on a stale build forever (worst case) or break offline (other worst case). *Mitigation:* test by deploying twice in a row to a staging Netlify branch (Netlify supports branch deploys) before promoting to keenbear.com. Confirm both "next-load freshness" and offline behavior on the staging URL.
- **R-1b: (NEW) Phase 2 mixed-asset race condition.** Unconditional `skipWaiting()` can serve a mix of old HTML and new JS/CSS on SW update. *Mitigation:* Switch to message-based `skipWaiting` + "new version available" notification with atomic reload on `controllerchange` (see D3 enhancement).
- **R-2: Phase 3 invisibles perf change loses visual fidelity.** ~~The single-`textContent` rendering may lose per-character coloring.~~ The "one span per run" approach preserves per-glyph CSS classes for invisible markers. *Mitigation:* visual comparison against current `Show Invisibles` before shipping.
- **R-3: Phase 3 module split introduces a circular import.** `dom.js` is imported by `theme.js`, `keyboard.js`, `find.js`, and `invisibles.js`. If `dom.js` ever imports from any of those, Node ES modules will surface a confusing partial-export TDZ error. *Mitigation:* `dom.js` must only import from `js/cleaners.js`, `js/history.js`, and `js/find-replace.js`. Document this in a comment at the top of `dom.js`.
- **R-3b: (NEW) Phase 3 `sw.js` ASSETS not updated after module split.** If `sw.js` still lists `/js/ui.js` after the split, existing users' SW cache misses on sub-module fetches, breaking offline. *Mitigation:* Add `sw.js` to Unit 3.4 file list explicitly. Replace `/js/ui.js` with all 7 new paths.
- **R-3c: (NEW) `export let` shared state across modules.** Only the declaring module can reassign an `export let`. Siblings see the live value but can't write to it. *Mitigation:* Use setter functions or wrap in an object (`export const state = { ... }`).
- **R-4: TDD doc rule drift.** It's easy to add a test and forget `TESTING_GUIDE.md`. *Mitigation:* Units 1.5 and 3.5 explicitly require the doc update as a checklist item. Phase 2 has no new tests so there's no doc drift risk there.
- **R-5: `extractFromHTML` entity handling regression.** Removing the DOM dependency means we own the entity decoder. *Mitigation:* the new implementation must support a strict superset of the existing 5 entities, plus numeric/hex. Tests in Unit 1.2 cover the additions.
- **R-5b: (NEW) `extractFromHTML` `<br>`/block element behavior change.** Adding newline conversion for block elements changes the output for existing inputs. *Mitigation:* Update existing test expectations. The new behavior (preserving block structure) is more correct than the current behavior (collapsing everything to one line).
- **R-6: (NEW) `stripEmojis` strips `©` and `®`.** The emoji-regex-xs pattern matches these because they have the `Emoji` property. *Mitigation:* Document this as expected behavior. Users who want to preserve `©`/`®` can use the existing `normalizeUnicode` cleaner instead.

## Phased Delivery

### Phase 1 — Correctness fixes (Units 1.1–1.5)
- **Lands first.** Smallest, lowest risk, shippable independently.
- Deploys with bumped SW cache to `v6` so users get the new cleaners on next load.
- Independently mergeable, independently revertable.

### Phase 2 — Service worker overhaul (Units 2.1–2.2)
- **Lands after Phase 1 is in production for at least one deploy cycle**, so the cache manifest is known correct before changing the strategy.
- Bumps SW cache to `v7`.
- Tested on a Netlify branch deploy before promotion.

### Phase 3 — `ui.js` refactor + perf (Units 3.1–3.5)
- **Lands last.** Largest diff, no user-visible behavior change expected.
- Sub-units 3.1, 3.2, 3.3 can land in any order; Unit 3.4 lands after them; Unit 3.5 lands with or just after 3.4.
- Each sub-unit is independently revertable.

## Documentation Plan

- `TESTING_GUIDE.md` — updated in Units 1.5 and 3.5 with every new test name (per the repo TDD rule in `~/.claude/CLAUDE.md`).
- `AGENTS.md` — updated in Units 2.2 (cache version-bump rule) and 3.5 (new module layout under `js/ui/`).
- `docs/STATUS.md` — updated at the end of each phase to reflect what shipped.
- `docs/solutions/ui-bugs/invisibles-overlay-perf.md` — new solution doc created in Unit 3.5, mirroring the format of `mac-alt-number-keyboard-shortcuts.md`.
- `README.md` — no changes required. The Architecture section continues to describe the right modules at a level of abstraction that survives the Phase 3 split. (If the implementer disagrees during review, a minor README touch-up is acceptable as a follow-up.)

## Operational / Rollout Notes

- Each phase ships as a normal Netlify deploy from `main`. No feature flags. No migrations.
- Phase 2 should be deployed during a low-traffic window so the SW cache transition has minimal user-visible impact even in the worst case.
- Verify Phase 2 by visiting keenbear.com on a fresh browser profile, then making a trivial CSS change, deploying, and confirming the new CSS appears on the second reload.
- No monitoring infrastructure exists; all verification is manual.

## Future Considerations (out of scope, recorded so they aren't lost)

- **Web Worker offload for cleaner execution** on inputs above a threshold. Would require the `(text) => text` contract to gain an async variant for the wrapper but cleaners themselves stay pure.
- **History as diffs** instead of full snapshots. Worth doing if memory becomes a concern.
- **`stripLeadingIndentation` tab/space column normalization.** Treat tabs as N columns before computing minimum indent.
- **`shortcut` field on cleaners** to decouple Alt+1-9 from registry order so the sidebar can be reordered without breaking muscle memory.
- **CSP header in `netlify.toml`** for paste safety.
- **Local-only "recently used" sorting** via a `localStorage` counter — fits the privacy-first model.
- **Browser-level integration tests** (Playwright or similar) — would require a dependency, so it's a deliberate non-decision for now.

## Sources & References

- Origin document: none. This plan was derived from a code-review pass on 2026-04-07.
- Related code:
  - `js/cleaners.js` (`stripEmojis` line 173, `extractFromHTML` line 141, `stripURLs` line 204, `fixPunctuationSpacing` line 219)
  - `js/ui.js` (`applyTextChange` line 41, `renderInvisibles` line 399, `syncScroll` line 431, `updateStatus` line 255, `FLAVORS` line 145)
  - `sw.js` (full file, 37 lines)
  - `test/run-node.js` (DOM shim block at top)
- Related learnings: [`docs/solutions/ui-bugs/mac-alt-number-keyboard-shortcuts.md`](../solutions/ui-bugs/mac-alt-number-keyboard-shortcuts.md)
- Related plans: [`docs/plans/2026-03-07-feat-keenbear-v1-text-cleaning-app-plan.md`](2026-03-07-feat-keenbear-v1-text-cleaning-app-plan.md) (V1 plan — for context only)
