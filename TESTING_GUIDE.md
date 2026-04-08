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
