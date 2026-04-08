---
title: "Make the invisibles overlay cheap enough for large pastes"
date: 2026-04-07
category: performance
tags: [ui, performance, invisibles, dom, pwa]
stack: [javascript, vanilla-js, css]
---

## Problem

`Show Invisibles` rebuilt the overlay one character at a time and kept it in sync with an always-on `requestAnimationFrame` loop. Large pastes turned into thousands of DOM nodes per keystroke and unnecessary main-thread wakeups.

## Solution

Split the overlay code into `js/ui/invisibles.js`, render visible text in runs instead of per character, and schedule redraws with `requestIdleCallback` (with a `setTimeout` fallback). Replace the RAF polling loop with a passive `scroll` listener, add `contain: strict` to the overlay, and auto-disable invisibles for very large documents.

## Key Insight

For text overlays, the biggest win is reducing DOM node count before chasing micro-optimizations. Once rendering moves to “one span per marker, one text node per visible run,” the rest of the performance work becomes incremental.

## Prevention

- Keep pure helpers exportable so perf-sensitive logic can be tested in Node without a DOM shim.
- Treat always-on animation loops as suspicious; prefer event-driven sync when the browser already emits the state change.
- When adding new cached UI modules, bump `CACHE_VERSION` in `sw.js` so offline users get the full updated asset set.
