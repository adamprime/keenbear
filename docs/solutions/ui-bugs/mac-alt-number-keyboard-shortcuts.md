---
title: "Use e.code instead of e.key for Alt+number keyboard shortcuts on Mac"
date: 2026-03-17
category: ui-bugs
tags: [keyboard-shortcuts, macos, e-code, e-key, alt-key, option-key, composed-characters, cross-platform]
stack: [javascript, vanilla-js, keyboard-events]
---

## Problem

Alt/Option+number keyboard shortcuts (Alt+1 through Alt+9 for cleaners, Alt+0 for toggling invisibles) silently failed on macOS. Pressing Option+1 inserted the `¡` character into the textarea instead of running the first cleaner. The shortcuts worked correctly on Windows and Linux.

## Root Cause

The handler used `e.key` to detect which number was pressed:

```js
// BROKEN on Mac
if (e.altKey && e.key === '0') { ... }
if (e.altKey && e.key >= '1' && e.key <= '9') { ... }
```

On macOS, holding the Option (Alt) key causes the OS to compose special characters *before* the browser event fires. The `e.key` property reflects the composed result, not the physical key:

| Keys pressed | `e.key` on Mac | `e.key` on Windows/Linux |
|---|---|---|
| Option+0 | `º` | `0` |
| Option+1 | `¡` | `1` |
| Option+2 | `™` | `2` |
| Option+3 | `£` | `3` |
| Option+9 | `ª` | `9` |

So the `e.key === '1'` check never matched on Mac because `e.key` was `¡`, not `1`.

## Solution

Switched from `e.key` (logical character) to `e.code` (physical key), which reports the key's position on the keyboard regardless of OS-level composition.

**Before (broken on Mac):**
```js
if (e.altKey && e.key === '0') {
  // ...toggle invisibles
}
if (e.altKey && e.key >= '1' && e.key <= '9') {
  const index = parseInt(e.key) - 1;
  // ...run cleaner
}
```

**After (works on all platforms):**
```js
if (e.altKey && e.code === 'Digit0') {
  // ...toggle invisibles
}
if (e.altKey && e.code >= 'Digit1' && e.code <= 'Digit9') {
  const index = parseInt(e.code.slice(-1)) - 1;
  // ...run cleaner
}
```

Three lines changed in `js/ui.js` (commit `78ed230`).

## Key Insight

**Use `e.code` instead of `e.key` for keyboard shortcuts that combine modifier keys with alphanumeric keys.** `e.key` reflects the *logical character* after OS-level transformations (dead keys, Option-composing on Mac, AltGr on international layouts), while `e.code` reflects the *physical key* and is stable across platforms and keyboard layouts. Any shortcut using Alt/Option as a modifier should use `e.code` to avoid platform-specific composition interference.

| Property | Returns | Use When |
|----------|---------|----------|
| `e.key` | The character produced (layout- and modifier-sensitive) | You care about what character the user typed (text input, search fields) |
| `e.code` | The physical key pressed (stable across platforms) | You care about which key was pressed (shortcuts, hotkeys) |

## Prevention

- **Convention:** All shortcut handlers in Keen Bear use `e.code` for physical key matching. `e.key` is only for character-based logic (e.g., the `/` key to focus filter, where we want the actual character).
- **Testing:** When adding any new keyboard shortcut, test on Mac where Option produces composed characters. If dispatching synthetic `KeyboardEvent`s in tests, always set both `key` and `code` properties.
- **Code review signal:** Any `e.key` usage in a shortcut handler that also checks `e.altKey` is a bug on Mac.

## References

- [MDN: KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) — physical key, unaffected by modifiers or layout
- [MDN: KeyboardEvent.key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) — logical character after OS composition
- [Stack Overflow: How to handle Alt+key on macOS browsers](https://stackoverflow.com/questions/68102630/how-to-handle-altp-keyboardevent) — community discussion of this exact issue
