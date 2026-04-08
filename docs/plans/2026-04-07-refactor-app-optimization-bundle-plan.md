---
title: "refactor: App optimization bundle (correctness, caching, structure, perf)"
type: refactor
status: active
date: 2026-04-07
origin: null  # No upstream brainstorm — derived from in-conversation code review on 2026-04-07
---

# refactor: App optimization bundle (correctness, caching, structure, perf)

## Overview

A phased optimization pass on Keen Bear V1.5 covering three independent but related areas:

1. **Correctness bug fixes** — small, low-risk fixes for cleaners and the offline asset manifest.
2. **Service worker caching overhaul** — change the update strategy so users don't get stuck on stale builds and offline parity is complete.
3. **`ui.js` structural refactor + interactive perf** — split the 563-line UI module into focused pieces and remove the per-keystroke costs that hurt large pastes.

The work is sequenced so each phase can ship independently and so risk increases monotonically: Phase 1 is shippable today, Phase 2 affects all users on next deploy, Phase 3 is a structural refactor with no intended behavior change.

## Problem Frame

Keen Bear V1.5 is feature-complete and deployed at keenbear.com. A code-review pass surfaced a cluster of issues that the test suite did not catch and that will only get worse as feature surface grows:

- Two cleaners produce incorrect output on common inputs (`stripEmojis` mangles digits/`#`/`*`; `extractFromHTML` round-trips through `textarea.innerHTML`, which is brittle for inputs with stray `<`).
- The service worker (`sw.js v5`) is **cache-first with no revalidation**, and its asset manifest is **missing `style.css`** — a deployed bug where offline users can see unstyled HTML and online users can be pinned to a stale JS bundle indefinitely.
- `js/ui.js` has grown to 563 lines and conflates DOM, theme strings, keyboard shortcuts, find/replace wiring, the invisibles overlay, and mobile sheet logic. It also re-renders the invisibles overlay (one DOM node per character) on every keystroke when active, which janks on large pastes — a common Keen Bear use case.

The work is internal-quality oriented. Users don't get new features, but they get correct cleaners, reliable updates, complete offline support, and a UI that doesn't stutter on big pastes.

## Requirements Trace

- **R1.** `stripEmojis` must not remove ASCII digits, `#`, or `*` from input that contains no actual emoji.
- **R2.** `extractFromHTML` must correctly handle inputs containing stray `<` characters and HTML entities, in both browser and Node test runners.
- **R3.** The service worker manifest must include every asset required to render the app offline (notably `style.css`).
- **R4.** A new deploy must reach existing users on the **next page load** (not "two loads later" or "after a hard refresh"), without breaking offline support.
- **R5.** `js/ui.js` must be split into focused modules each with a single responsibility, preserving every existing behavior and keyboard shortcut.
- **R6.** With "Show Invisibles" enabled, typing into a 100KB+ textarea must not block the main thread for more than one frame per keystroke.
- **R7.** All 143 existing tests continue to pass; new tests cover every newly-fixed bug and every new module boundary that contains logic.
- **R8.** Zero new runtime dependencies. No build step. No framework. (`AGENTS.md` non-negotiables.)
- **R9.** `TESTING_GUIDE.md` is updated for every new test added (per `~/.claude/CLAUDE.md` TDD rule).

## Scope Boundaries

**In scope:**
- Cleaner correctness fixes for `stripEmojis`, `extractFromHTML`, `stripURLs` (trailing punctuation), `fixPunctuationSpacing` (closing quotes/brackets).
- Adding `style.css` to the SW manifest, switching update strategy, version bump strategy.
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

- **D1. `stripEmojis` switches to `\p{Extended_Pictographic}` + ZWJ joiner cleanup.**
  *Rationale:* `\p{Emoji}` matches `0-9`, `#`, and `*`, which is the root cause of the current correctness bug. `\p{Extended_Pictographic}` is the Unicode standard for "actual emoji glyphs" and is supported in all evergreen browsers and Node ≥ 12. ZWJ sequences (`\u200D`) and emoji modifier/variation selectors (`\uFE0F`, `\uFE0E`) are stripped after the main pass to clean up orphans.

- **D2. `extractFromHTML` becomes pure (no DOM) and decodes entities inline.**
  *Rationale:* The current `textarea.innerHTML = ...` approach is fragile (re-parses stray `<`), forces a DOM shim in the Node test runner, and is the only cleaner that breaks the "pure function" contract. Replacing it with a small entity map (already prototyped in the Node shim) makes the cleaner pure, removes the DOM dependency, and lets us delete the shim. Numeric entities (`&#39;`, `&#x27;`) must be supported in addition to the named entities the shim already handles. This is a small, well-bounded function.

- **D3. Service worker switches to "stale-while-revalidate for shell, cache-first for images, network-first for nothing."**
  *Rationale:* Keen Bear is a static-asset PWA. The shell (HTML/CSS/JS) needs to update reliably without breaking offline. Stale-while-revalidate gives users an instant load from cache and quietly fetches the fresh version in the background, so they get the new build on the **second** load — at most one stale render. Combined with `clients.claim()` (already present) and a precache step that always loads the new manifest on `install`, users on a stale tab still get the update on next refresh. Pure-cache-first would be wrong because it strands users on old builds; pure network-first would break offline.

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

- **D6. Invisibles re-rendering moves to a single batched node, scheduled in `requestAnimationFrame`, with the per-keystroke trigger debounced.**
  *Rationale:* The current implementation creates one `<span>` per character. For a 100KB paste that's 100k DOM nodes per keystroke. The replacement strategy: build a single string with the substitution characters inserted (`·`, `→`, `¶`) and assign it to the overlay's `textContent` once. Wrap that in `requestAnimationFrame` so consecutive keystrokes coalesce to one render per frame. CSS handles the visual styling of invisibles via background color or pseudo-classes; no per-character span needed for the basic version. **Caveat:** if differential coloring per invisible type is required for parity with the current look, fall back to building **one span per *run* of normal text** rather than per character — still a 1000x reduction for typical text. This is captured as a sub-decision in Unit 3.2.

- **D7. `syncScroll` switches from an always-on RAF loop to a `scroll` event listener.**
  *Rationale:* The textarea fires `scroll` events; there is no reason to wake the main thread 60 times a second when nothing is scrolling. The current loop only exists because `scroll` event-based sync was probably tried first and had a flicker, but a scroll-event listener with `{ passive: true }` is the standard approach and matches what the textarea actually does.

- **D8. `updateStatus` debounces to `requestAnimationFrame` when the input is large.**
  *Rationale:* Counts are visual feedback, not load-bearing state. A one-frame delay on a 1MB textarea is invisible to users and avoids re-trimming and re-splitting per keystroke. Small inputs continue to update synchronously so the test harness and the small-input UX feel unchanged.

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

- [ ] **Unit 1.1: Fix `stripEmojis` correctness**

**Goal:** `stripEmojis` no longer removes ASCII digits, `#`, or `*` while still removing all real emoji including ZWJ sequences and skin tone modifiers.

**Requirements:** R1, R7

**Dependencies:** None

**Files:**
- Modify: `js/cleaners.js` (`stripEmojis` only)
- Test: `test/cleaners.test.js` (new `describe` block additions)

**Approach:**
- Replace the current `\p{Emoji}`-based regex with `\p{Extended_Pictographic}` plus a follow-up pass for `\uFE0F`, `\uFE0E`, and orphaned `\u200D` joiners.
- Do not change the function signature or registry entry.

**Execution note:** Test-first. Add the failing cases (digits, `#`, `*`, mixed text-with-emoji, family ZWJ sequence, skin-tone modifier) before touching the implementation.

**Patterns to follow:** existing `stripEmojis` function in `js/cleaners.js` and the `describe`/`it` style in `test/cleaners.test.js`.

**Test scenarios:**
- `"call 911"` → unchanged
- `"#hashtag *bold*"` → unchanged
- `"hi 👋 world"` → `"hi  world"`
- `"👨‍👩‍👧‍👦 family"` → `" family"` (ZWJ family removed cleanly, no orphaned ZWJ)
- `"thumbs 👍🏽 up"` → `"thumbs  up"` (skin tone modifier removed)
- `"flag 🇺🇸"` → `"flag "` (regional indicator pair removed)
- Empty string → empty string (existing test continues to pass)

**Verification:**
- `node test/run-node.js` reports the new tests passing and all existing tests still green.
- Manual smoke test: paste a sentence with phone numbers and currency symbols into the deployed app with the cleaner; nothing other than emoji disappears.

---

- [ ] **Unit 1.2: Make `extractFromHTML` pure and update tests**

**Goal:** `extractFromHTML` no longer touches the DOM, handles stray `<`, and supports numeric entities.

**Requirements:** R2, R7, R8

**Dependencies:** None

**Files:**
- Modify: `js/cleaners.js` (`extractFromHTML` only)
- Modify: `test/run-node.js` (delete the `globalThis.document` shim block)
- Test: `test/cleaners.test.js` (new cases)

**Approach:**
- Strip tags with the existing `<[^>]*>` regex (acceptable because this cleaner is for "extract text from HTML I pasted," not a sanitizer).
- Decode entities inline using a small map: `&amp; &lt; &gt; &quot; &#39;` plus a `&#(\d+);` and `&#x([0-9a-fA-F]+);` handler.
- Cleaner becomes a pure `(text) => text` function with no DOM dependency, restoring the contract every other cleaner already follows.
- Delete the Node test runner's `document` shim now that nothing needs it.

**Execution note:** Test-first.

**Patterns to follow:** Other pure cleaners in `js/cleaners.js` (`normalizeUnicode` is the closest analog — string-in, string-out, regex-replace pipeline).

**Test scenarios:**
- `"<p>Hello <b>world</b></p>"` → `"Hello world"` (existing test continues to pass)
- `"&amp;&lt;&gt;&quot;&#39;"` → `"&<>\"'"`
- `"&#65;&#x42;"` → `"AB"` (numeric and hex entities)
- `"a < b and c > d"` → `"a < b and c > d"` (stray `<`/`>` survive — current implementation mangles this)
- `"<script>alert(1)</script>safe"` → `"alert(1)safe"` (tags stripped, no execution)
- Empty string → empty string

**Verification:**
- All `extractFromHTML` tests pass under both `node test/run-node.js` and the browser harness.
- Search confirms no `document.` references remain in `js/cleaners.js`.

---

- [ ] **Unit 1.3: Tighten `stripURLs` and `fixPunctuationSpacing` edges**

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

- [ ] **Unit 1.4: Add `style.css` to the SW manifest and bump cache version**

**Goal:** Offline users render the app with full styling.

**Requirements:** R3

**Dependencies:** None (this is a one-character change but lives in Phase 1 because it's a correctness fix, not a strategy change)

**Files:**
- Modify: `sw.js` (`ASSETS` array + `CACHE_NAME`)

**Approach:**
- Insert `'/style.css'` into the `ASSETS` array.
- Bump `CACHE_NAME` from `keenbear-v5` to `keenbear-v6`.

**Test scenarios:** (manual; no automated SW tests in this repo)
- Load the deployed app, hard-refresh to install the new SW, go offline (DevTools → Network → Offline), reload — app renders styled.
- Confirm via DevTools → Application → Cache Storage that `style.css` is in the `keenbear-v6` cache.

**Verification:**
- Offline reload of the app shows the Salty Octopus theme intact.
- No console errors.

---

- [ ] **Unit 1.5: Update `TESTING_GUIDE.md` and `docs/STATUS.md` for Phase 1**

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
fetch(request):
    if shell(request):
        cached = match(request)
        revalidate = fetch(request).then(put-in-cache)
        return cached ?? await revalidate
    if image(request):
        cached = match(request)
        return cached ?? fetch+cache(request)
    return fetch(request)
```

**Patterns to follow:** Existing `sw.js` install/activate handlers — keep the same single-file shape and avoid introducing helper modules. Service worker stays under 100 lines.

**Test scenarios:** (manual — service worker behavior is hard to unit-test in this repo and a test framework for it is out of scope)
- Deploy two consecutive builds with a visible CSS change. Confirm the second build appears on the second reload, not the third.
- Take the app offline after install, reload — full app loads with current cache.
- Modify a JS file locally, hard-refresh, confirm the change appears on the **next** soft reload without DevTools intervention.

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
- Split rendering into two functions:
  1. `renderInvisiblesString(text)` — pure, returns a string with `·` for spaces, `→` followed by a tab for tabs, and `¶` before each newline. Testable in Node with no DOM.
  2. `renderInvisibles()` — DOM side: assigns the result of (1) to `invisiblesOverlay.textContent` once. No per-character spans.
- Wrap `renderInvisibles` in a single `requestAnimationFrame` queue: if a render is already pending for the next frame, don't schedule another.
- If color-per-glyph styling is required for parity with the current look, fall back to a "one span per *run* of normal text" approach where `invisiblesOverlay.replaceChildren(...)` is called with an array of text nodes and `<span>` elements for the marker characters. Implementer makes this call after a visual comparison against the current `Show Invisibles` look.
- Replace the always-on `syncScroll` RAF loop with a `textarea.addEventListener('scroll', ..., { passive: true })` listener that copies `scrollTop`/`scrollLeft` to the overlay. Cancel the old RAF loop on toggle-off.

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
- Create: `js/ui/dom.js` — element refs, `applyTextChange`, `updateStatus`, `updateUndoRedoButtons`, mobile sheet handlers, toolbar handlers
- Create: `js/ui/keyboard.js` — `handleKeydown`, with a comment re-asserting the `e.code` Mac convention from `docs/solutions/ui-bugs/mac-alt-number-keyboard-shortcuts.md`
- Create: `js/ui/find.js` — find/replace panel wiring (`openFindPanel`, `closeFindPanel`, `updateMatchCount`, `handleReplaceAll`, etc.)
- Create: `js/ui/index.js` — re-exports `init()` so it can be imported as before
- Modify: `js/ui.js` — becomes a one-line `export { init } from './ui/index.js'` shim, OR is deleted and `js/app.js` imports `./ui/index.js` directly. Implementer's choice based on diff size.
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
- **R-2: Phase 3 invisibles perf change loses visual fidelity.** The single-`textContent` rendering may lose per-character coloring. *Mitigation:* the plan explicitly captures the run-based span fallback in D6 and Unit 3.2; the implementer should compare visually before settling on the simpler approach.
- **R-3: Phase 3 module split introduces a circular import.** `dom.js` is imported by `theme.js`, `keyboard.js`, `find.js`, and `invisibles.js`. If `dom.js` ever imports from any of those, Node ES modules will surface a confusing partial-export error. *Mitigation:* `dom.js` must only import from `js/cleaners.js`, `js/history.js`, and `js/find-replace.js`. Document this in a comment at the top of `dom.js`.
- **R-4: TDD doc rule drift.** It's easy to add a test and forget `TESTING_GUIDE.md`. *Mitigation:* Units 1.5 and 3.5 explicitly require the doc update as a checklist item. Phase 2 has no new tests so there's no doc drift risk there.
- **R-5: `extractFromHTML` entity handling regression.** Removing the DOM dependency means we own the entity decoder. *Mitigation:* the new implementation must support a strict superset of the existing 5 entities, plus numeric/hex. Tests in Unit 1.2 cover the additions.

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
