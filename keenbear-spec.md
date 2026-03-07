# Keen Bear — Spec

**KeenBear.com** — A free, dark-mode text cleaning utility. Paste dirty text in, pick a cleaner, get clean text out.

Part of Adam Tervort's collection of small, useful web tools (see also: TL;DResume, Breathe Easy, ComicCaster).

## Overview

Single-page web app. No server, no accounts, no dependencies. Public utility — anyone can use it, no sign-up required.

## Tech

- Plain HTML + CSS + vanilla JS (no framework, no build step)
- Single `index.html` or split into index.html / style.css / app.js — builder's choice
- Dark mode by default, optional light mode toggle
- Responsive but optimized for desktop (this is a work tool)

## Layout

Two-panel layout, similar to TextSoap:

```
┌─────────────────────────────────────────────────────────┐
│  [Paste]  [Copy All]  [Clear]  [Undo]        ☀️/🌙     │
├───────────────────────────────────────┬─────────────────┤
│                                       │  CLEANERS       │
│                                       │  ─────────────  │
│   Text editing area                   │  🔍 Filter...   │
│   (monospace, editable)               │                 │
│                                       │  Remove Extra   │
│                                       │    Spaces       │
│                                       │  Remove Extra   │
│                                       │    Returns      │
│                                       │  Strip Leading  │
│                                       │    Indentation  │
│                                       │  Find & Replace │
│                                       │  ...            │
│                                       │                 │
│                                       │  MY SCRUB       │
│                                       │  (chained       │
│                                       │   cleaners)     │
│                                       │                 │
├───────────────────────────────────────┴─────────────────┤
│  Plain ▾ │ chars: 1,243 │ lines: 47 │ words: 189       │
└─────────────────────────────────────────────────────────┘
```

## Text Area

- Monospace font (SF Mono, JetBrains Mono, or system monospace)
- Contenteditable div or textarea — needs to handle large pastes (10k+ lines)
- Show invisible characters toggle (whitespace dots, paragraph marks — like TextSoap's ¶ display)
- Line numbers optional (nice to have, not required for v1)
- Pasting rich text automatically strips to plain text (this is a plain text tool)
- Standard keyboard shortcuts: Cmd+A (select all), Cmd+Z (undo), Cmd+Shift+Z (redo), Cmd+C (copy)

## Toolbar

- **Paste** — reads from clipboard (navigator.clipboard.readText)
- **Copy All** — copies entire text area contents to clipboard
- **Clear** — empties the text area (with undo support)
- **Undo/Redo** — maintains history stack (at least 20 levels)
- **Theme toggle** — dark/light, persisted to localStorage

## Cleaners (Right Panel)

Clickable list. Clicking a cleaner applies it to the full text immediately. Each application is one undo step.

### Core Cleaners (v1 — must have)

| Cleaner | Behavior |
|---|---|
| **Remove Extra Spaces** | Collapse runs of 2+ spaces to single space. Trim trailing spaces per line. |
| **Remove Extra Returns** | Collapse runs of 3+ newlines to 2 (preserves paragraph breaks, kills triple+ gaps) |
| **Strip Leading Indentation** | Detect smallest common indent across non-empty lines, remove that amount from all lines. Smart: handles mixed spaces/tabs. |
| **Remove All Tabs** | Replace tabs with spaces (default 2, configurable) or remove entirely |
| **Remove Forwarding Characters** | Strip leading `>` and `> ` from all lines (email quoting) |
| **Trim Whitespace** | Trim leading and trailing whitespace from every line |
| **Find & Replace** | Opens inline panel: two fields (find/replace), options for regex and case-sensitive. Apply button. Highlights matches in real-time. |

### Text Transform Cleaners (v1 — nice to have)

| Cleaner | Behavior |
|---|---|
| **UPPERCASE** | Convert all text to uppercase |
| **lowercase** | Convert all text to lowercase |
| **Title Case** | Capitalize first letter of each word (smart: skip articles/prepositions mid-sentence) |
| **Sentence case** | Capitalize first letter after sentence-ending punctuation |
| **Straighten Quotes** | Convert smart/curly quotes (" " ' ') to straight (" ') |
| **Smarten Quotes** | Convert straight quotes to smart/curly quotes |
| **Extract from HTML** | Strip all HTML tags, decode entities, keep text content |
| **Rewrap Text** | Reflow text to N characters per line (default 80, configurable) |
| **Sort Lines** | Alphabetical sort, one option for ascending/descending |
| **Remove Duplicate Lines** | Deduplicate, preserving first occurrence order |
| **Number Lines** | Prepend line numbers |
| **Remove Line Numbers** | Strip leading `\d+[.:\s]+` patterns |

### Filter Bar

- Text input above the cleaner list
- Filters cleaner names as you type (fuzzy or substring match)
- Keyboard shortcut: Cmd+K or `/` focuses the filter

## My Scrub (Chained Cleaners)

- User can define a custom chain of cleaners that run in sequence
- One "My Scrub" button at top of cleaner list runs the whole chain
- Configuration: drag cleaners into the chain, reorder, remove
- Persist chain to localStorage
- v1: one chain is fine. v2 could support named chains.

## Find & Replace Panel

When "Find & Replace" is clicked, an inline panel slides open (above or below the text area):

```
┌──────────────────────────────────────────────┐
│  Find:    [________________]  [x] Regex      │
│  Replace: [________________]  [x] Match Case │
│                                              │
│  3 matches     [Replace All]  [Close]        │
└──────────────────────────────────────────────┘
```

- Real-time match highlighting in the text area
- Match count display
- Replace All applies as one undo step
- Keyboard shortcut: Cmd+F opens this panel

## Status Bar (Bottom)

- Character count
- Word count
- Line count
- Updates live as text changes or cleaners run

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Cmd+V | Paste (strips to plain text) |
| Cmd+C | Copy selection (or all if no selection) |
| Cmd+A | Select all |
| Cmd+Z | Undo |
| Cmd+Shift+Z | Redo |
| Cmd+F | Open Find & Replace |
| Cmd+K or / | Focus cleaner filter |
| Escape | Close Find & Replace / clear filter |

## Visual Design

- **Dark mode default.** Dark background (#1a1a2e or similar), light text, high contrast.
- Light mode available via toggle (persisted).
- Cleaner list items: subtle hover state, brief flash/highlight on click to confirm action.
- Monospace text area with comfortable line-height (1.5-1.6).
- No rounded-everything, no gratuitous gradients. Clean, functional, slightly warm.
- Mascot: a bear with cleaning supplies (mop, bucket, spray bottle — TBD based on mascot art). Appears in header/hero area, favicon, and OG image. Friendly but competent — a bear who takes pride in clean text.
- Inspiration: the TextSoap layout but with a modern dark IDE aesthetic. Think VS Code's sidebar + editor split.
- Brand voice: slightly playful (it's a bear named Keen Bear who cleans your text), but the tool itself is serious and fast.

## What This Is NOT

- Not a code editor (no syntax highlighting, no language modes)
- Not a notes app (no save/open, no file management)
- Not online-required (works offline, no API calls, fully local)
- Not a rich text editor (everything is plain text, always)

## Branding

- **Name:** Keen Bear
- **Domain:** keenbear.com
- **Tagline:** "Clean text. No fuss." (or similar — short, functional)
- **Mascot:** Bear with cleaning supplies (see mascot prompt below)
- **Header:** Small mascot + "Keen Bear" wordmark + tagline. Not a landing page — the tool IS the page. Mascot should be compact, not a hero banner.
- **Footer:** "Built by [Adam Tervort](https://adamtervort.com)" + link to portfolio. Keep it minimal — one line.
- **OG image:** Mascot + "Keen Bear" text + tagline on dark background. 1200x630.
- **Favicon:** Mascot head, simplified for 32x32 and 16x16.

## Deployment

- Static site: Netlify (same pattern as lever.adamtervort.com)
- PWA manifest so it can be "installed" as a standalone window
- Nice to have: `Cmd+N` opens a fresh window (if PWA)

## Future / v2 Ideas (out of scope for today)

- Alfred workflow integration (pipe clipboard through TextScrub cleaners via URL scheme)
- Multiple named My Scrub chains
- Import/export cleaner chains as JSON
- Regex-based custom cleaners (user-defined, saved to localStorage)
- Diff view (before/after split pane)
- Drag-and-drop .txt files into the text area
