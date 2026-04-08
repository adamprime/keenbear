import { cleaners } from '../cleaners.js';
import { History } from '../history.js';

// This module must only import from outside ui/.
// Note: handlePasteEvent is a second mutation path; keep its hooks aligned with applyTextChange.

const history = new History(20);
const scheduleFrame = globalThis.requestAnimationFrame
  ? globalThis.requestAnimationFrame.bind(globalThis)
  : (callback) => setTimeout(callback, 0);
const cancelFrame = globalThis.cancelAnimationFrame
  ? globalThis.cancelAnimationFrame.bind(globalThis)
  : globalThis.clearTimeout.bind(globalThis);

const STATUS_LARGE_INPUT_THRESHOLD = 50_000;

export const state = { composing: false, invisiblesActive: false, lastActionWasCleaner: false };
export const refs = {
  textarea: document.getElementById('text-area'), cleanerList: document.getElementById('cleaner-list'),
  filterInput: document.getElementById('filter-input'), btnPaste: document.getElementById('btn-paste'),
  btnCopy: document.getElementById('btn-copy'), btnClear: document.getElementById('btn-clear'),
  btnUndo: document.getElementById('btn-undo'), btnRedo: document.getElementById('btn-redo'),
  btnFind: document.getElementById('btn-find'), themeToggle: document.getElementById('theme-toggle'),
  flavorSelect: document.getElementById('flavor-select'), statusChars: document.getElementById('status-chars'),
  statusWords: document.getElementById('status-words'), statusLines: document.getElementById('status-lines'),
  statusNote: document.getElementById('status-note'), sidebar: document.getElementById('sidebar'),
  mobileBtn: document.getElementById('btn-mobile-cleaners'), mobileBackdrop: document.getElementById('mobile-backdrop'),
  btnInvisibles: document.getElementById('btn-invisibles'), invisiblesOverlay: document.getElementById('invisibles-overlay'),
  findPanel: document.getElementById('find-replace-panel'), findInput: document.getElementById('find-input'),
  replaceInput: document.getElementById('replace-input'), findRegex: document.getElementById('find-regex'),
  findCase: document.getElementById('find-case'), findMatchCount: document.getElementById('find-match-count'),
  btnReplaceAll: document.getElementById('btn-replace-all'), btnFindClose: document.getElementById('btn-find-close'),
  findError: document.getElementById('find-error'), tagline: document.getElementById('tagline'),
  sidebarTitle: document.querySelector('.sidebar-title'),
};
export const platform = {
  isMac: navigator.platform?.toUpperCase().includes('MAC') || navigator.userAgent?.includes('Mac'),
  modKey: (navigator.platform?.toUpperCase().includes('MAC') || navigator.userAgent?.includes('Mac')) ? '⌥' : 'Alt+',
};

const hooks = { isFindPanelOpen: () => false, renderInvisibles: () => {}, updateMatchCount: () => {} };

let statusFrame = null;

export function setUiHooks(nextHooks) {
  Object.assign(hooks, nextHooks);
}

function flushStatus(text) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split('\n').length : 0;
  refs.statusChars.textContent = `chars: ${chars.toLocaleString()}`;
  refs.statusWords.textContent = `words: ${words.toLocaleString()}`;
  refs.statusLines.textContent = `lines: ${lines.toLocaleString()}`;
}

export function setStatusNote(note = '') {
  if (!refs.statusNote) return;
  refs.statusNote.hidden = !note;
  refs.statusNote.textContent = note;
}

export function updateStatus({ force = false } = {}) {
  const text = refs.textarea.value;
  if (!force && text.length >= STATUS_LARGE_INPUT_THRESHOLD) {
    if (statusFrame !== null) return;
    statusFrame = scheduleFrame(() => {
      statusFrame = null;
      flushStatus(refs.textarea.value);
    });
    return;
  }

  if (statusFrame !== null) {
    cancelFrame(statusFrame);
    statusFrame = null;
  }

  flushStatus(text);
}

export function updateUndoRedoButtons() {
  refs.btnUndo.disabled = !history.canUndo;
  refs.btnRedo.disabled = !history.canRedo;
}

export function applyTextChange(run, source = 'cleaner') {
  const previous = refs.textarea.value;
  const next = run(previous);
  if (next === previous) return;

  if (!history.canUndo && !history.canRedo) {
    history.push(previous, 'initial');
  }

  history.push(next, source);
  state.lastActionWasCleaner = true;
  refs.textarea.value = next;
  updateStatus({ force: true });
  updateUndoRedoButtons();
  if (state.invisiblesActive) hooks.renderInvisibles();
}

export function flashItem(element) {
  element.classList.add('flash');
  setTimeout(() => element.classList.remove('flash'), 200);
}

export function renderCleanerList() {
  refs.cleanerList.replaceChildren();
  cleaners.forEach((cleaner, index) => {
    const item = document.createElement('li');
    item.className = 'cleaner-item';
    item.dataset.id = cleaner.id;
    item.dataset.category = cleaner.category;
    const name = document.createElement('span');
    name.textContent = cleaner.name;
    item.appendChild(name);
    if (index < 9) {
      const shortcut = document.createElement('kbd');
      shortcut.className = 'cleaner-shortcut';
      shortcut.textContent = `${platform.modKey}${index + 1}`;
      item.appendChild(shortcut);
    }
    item.addEventListener('click', () => {
      applyTextChange((text) => cleaner.fn(text), cleaner.id);
      flashItem(item);
    });
    refs.cleanerList.appendChild(item);
  });
}

export function runCleanerByIndex(index) {
  const cleaner = cleaners[index];
  if (!cleaner) return;
  applyTextChange((text) => cleaner.fn(text), cleaner.id);
  const item = refs.cleanerList.querySelectorAll('.cleaner-item')[index];
  if (item) flashItem(item);
}

export function handleUndo() {
  if (!history.canUndo) return;
  const previous = history.undo();
  state.lastActionWasCleaner = false;
  refs.textarea.value = previous ?? '';
  updateStatus({ force: true });
  updateUndoRedoButtons();
  if (state.invisiblesActive) hooks.renderInvisibles();
}

export function handleRedo() {
  if (!history.canRedo) return;
  const next = history.redo();
  state.lastActionWasCleaner = false;
  refs.textarea.value = next ?? '';
  updateStatus({ force: true });
  updateUndoRedoButtons();
  if (state.invisiblesActive) hooks.renderInvisibles();
}

export function handleFilter() {
  const query = refs.filterInput.value.toLowerCase().trim();
  const items = refs.cleanerList.querySelectorAll('.cleaner-item');
  for (const item of items) {
    item.classList.toggle('hidden', query && !item.textContent.toLowerCase().includes(query));
  }
}

export function handlePasteEvent(event) {
  const text = event.clipboardData?.getData('text/plain');
  if (text === undefined) return;
  event.preventDefault();
  const start = refs.textarea.selectionStart;
  const end = refs.textarea.selectionEnd;
  const before = refs.textarea.value.slice(0, start);
  const after = refs.textarea.value.slice(end);
  const previous = refs.textarea.value;
  const next = before + text + after;
  refs.textarea.value = next;
  refs.textarea.selectionStart = refs.textarea.selectionEnd = start + text.length;
  if (next === previous) return;
  if (!history.canUndo && !history.canRedo) {
    history.push(previous, 'initial');
  }
  history.push(next, 'paste');
  state.lastActionWasCleaner = true;
  updateStatus({ force: true });
  updateUndoRedoButtons();
  if (state.invisiblesActive) hooks.renderInvisibles();
}

