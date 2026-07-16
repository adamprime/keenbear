# Testing Guide

## Run the suite

- `node test/run-node.js`
- `python3 -m http.server 8787` then open `http://localhost:8787/test/test-runner.html`

## Phase 1 regression coverage

### `stripEmojis`
- `preserves bare digits and strips keycap emoji`
- `preserves bare hash and asterisk characters`
- `removes skin tone modifiers with the emoji`
- `removes flags and tag-sequence emoji`
- `strips emoji-property symbols like copyright`

### `extractFromHTML`
- `decodes numeric and hex entities`
- `preserves stray angle brackets that are not tags`
- `strips script, style, and comment blocks`
- `preserves block and line breaks as newlines`
- `maps nbsp to regular spaces`

### `stripURLs`
- `preserves trailing sentence punctuation after a URL`
- `preserves a closing parenthesis after a URL`

### `fixPunctuationSpacing`
- `keeps closing quotes attached to punctuation`
- `keeps closing brackets attached to punctuation`

## Phase 3 regression coverage

### `renderInvisiblesString`
- `returns empty string for empty input`
- `renders markers for spaces and newlines, passing tabs through unchanged`
- `renders marker-only output for whitespace input`

### `createKeydownHandler`
- `runs the first cleaner for Alt+Digit1`
- `toggles invisibles for Alt+Digit0`
- `ignores composed Alt characters when the physical key is not a digit`
- `opens the find panel for Cmd+F`
- `closes the find panel on Escape when open`

## Remove Line Numbers coverage

### `removeLineNumbers`
- grep (`1:`), pipe (`1 |`), and cat -n (tab) prefix styles strip cleanly
- indentation after the separator survives (only one space consumed)
- all-or-nothing: mixed content and leading-number prose are left unchanged
- bare-number lines become empty lines; blank lines pass through
- ordered lists strip (documented user-invoked behavior)
- CRLF: bare-number lines keep their `\r` so line endings stay consistent
