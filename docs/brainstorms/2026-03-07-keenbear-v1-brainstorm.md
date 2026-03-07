---
date: 2026-03-07
topic: keenbear-v1
---

# Keen Bear v1 -- Text Cleaning Web Utility

## What We're Building

A free, dark-mode-first web app for cleaning plain text. Paste in messy text, click a cleaner (or a few), copy out clean text. Works on desktop and mobile, no accounts, no server, fully local. Inspired by TextSoap's utility-first UX but modernized with a dark IDE aesthetic and responsive layout.

The launch-critical capability is indent and unwrap cleanup -- stripping leading whitespace, reflowing pre-wrapped lines -- because that's the pain point Adam hits most often when moving text between coding tools and other apps.

## Why This Approach

**Approach B: ES module split with SOLID principles and TDD.**

Three approaches were considered:

1. **Single app.js** -- simplest, but harder to navigate and test as cleaners grow.
2. **ES module split** (chosen) -- `cleaners.js`, `history.js`, `ui.js`, `app.js`. Each module has a single responsibility. No build step (native ES modules). Pure-function cleaners are trivially testable. Open for extension without modifying existing code.
3. **Lit web components** -- real component encapsulation but adds a dependency and learning curve for a focused utility.

Approach B was chosen because it balances simplicity with SOLID organization, supports TDD naturally (pure functions are easy to test), and scales as more cleaners are added without any build tooling.

## Key Decisions

- **V1 focus:** Balanced desktop + mobile. Not desktop-first with mobile as afterthought.
- **Mobile layout:** Bottom sheet / drawer that slides up over the text area for the cleaner panel.
- **Text input:** `<textarea>` for editing, but switch to a rendered `<div>` overlay (or replace with contenteditable) when "show invisibles" is active. Native undo for typing; custom undo stack for cleaner applications.
- **Show invisibles:** Confirmed for v1. Toggle that renders paragraph marks, visible space dots, and line break indicators inline -- inspired by TextSoap's invisible character display. This is essential for a text cleaning tool (you need to see the mess to clean it).
- **Architecture:** ES modules, SOLID principles, TDD throughout.
- **My Scrub (chained cleaners):** Deferred to v2.
- **Theme:** Dark mode default, light mode toggle, persisted to localStorage.
- **Success criteria:** Core cleaners work reliably, undo works, looks good on phone and desktop.

## SOLID Mapping

| Principle | Application |
|-----------|-------------|
| Single Responsibility | Each module owns one concern: cleaners, history, UI, wiring |
| Open/Closed | Cleaner registry is extensible without modifying existing cleaners |
| Liskov Substitution | Every cleaner is `(text) => text`, fully interchangeable |
| Interface Segregation | UI doesn't depend on history internals; cleaners don't know about DOM |
| Dependency Inversion | `app.js` depends on abstractions (registry, history interface), not concretions |

## V1 Cleaner Scope

**Must-have (core):**
- Remove Extra Spaces
- Remove Extra Returns
- Strip Leading Indentation
- Remove All Tabs
- Trim Whitespace
- Rewrap Text (configurable line width)
- Find & Replace (inline panel, regex support)

**Nice-to-have (include if time allows):**
- Remove Forwarding Characters
- UPPERCASE / lowercase / Title Case / Sentence case
- Straighten / Smarten Quotes
- Sort Lines / Remove Duplicate Lines
- Extract from HTML

**Deferred to v2:**
- My Scrub (chained cleaners)
- Named cleaner chains
- Regex-based custom cleaners
- Diff view
- Alfred workflow integration

## Open Questions

- Exact monospace font stack (SF Mono vs JetBrains Mono vs system default)
- PWA manifest scope for v1 or defer
- Testing approach: browser-based test runner or Node-based (cleaners are pure JS, either works)

## Next Steps

Run `/workflows:plan` to break this into implementation steps with TDD.
