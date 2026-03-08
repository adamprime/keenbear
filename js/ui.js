import { cleaners } from './cleaners.js';
import { History } from './history.js';
import { countMatches, replaceAll as findReplaceAll } from './find-replace.js';

const history = new History(20);
let lastActionWasCleaner = false;
let composing = false;

// ── DOM refs ──

const textarea = document.getElementById('text-area');
const cleanerList = document.getElementById('cleaner-list');
const filterInput = document.getElementById('filter-input');
const btnPaste = document.getElementById('btn-paste');
const btnCopy = document.getElementById('btn-copy');
const btnClear = document.getElementById('btn-clear');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const themeToggle = document.getElementById('theme-toggle');
const statusChars = document.getElementById('status-chars');
const statusWords = document.getElementById('status-words');
const statusLines = document.getElementById('status-lines');
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('btn-mobile-cleaners');
const mobileBackdrop = document.getElementById('mobile-backdrop');
const findPanel = document.getElementById('find-replace-panel');
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const findRegex = document.getElementById('find-regex');
const findCase = document.getElementById('find-case');
const findMatchCount = document.getElementById('find-match-count');
const btnReplaceAll = document.getElementById('btn-replace-all');
const btnFindClose = document.getElementById('btn-find-close');
const findError = document.getElementById('find-error');

// ── Central mutation ──

function applyTextChange(run, source = 'cleaner') {
  const prev = textarea.value;
  const next = run(prev);
  if (next === prev) return;
  // Push prev state first if history is empty (first change)
  if (!history.canUndo && !history.canRedo) {
    history.push(prev, 'initial');
  }
  history.push(next, source);
  lastActionWasCleaner = true;
  textarea.value = next;
  updateStatus();
  updateUndoRedoButtons();
}

// ── Cleaner list rendering ──

function renderCleanerList() {
  cleanerList.innerHTML = '';
  for (const cleaner of cleaners) {
    const li = document.createElement('li');
    li.className = 'cleaner-item';
    li.dataset.id = cleaner.id;
    li.dataset.category = cleaner.category;
    li.textContent = cleaner.name;
    li.addEventListener('click', () => {
      applyTextChange(text => cleaner.fn(text), cleaner.id);
      flashItem(li);
    });
    cleanerList.appendChild(li);
  }
}

function flashItem(el) {
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 200);
}

// ── Toolbar ──

function handlePaste() {
  if (!navigator.clipboard || !navigator.clipboard.readText) return;
  navigator.clipboard.readText().then(text => {
    if (text) {
      applyTextChange(() => text, 'paste');
      textarea.focus();
    }
  }).catch(() => {
    // Permission denied or not in secure context — ignore silently
  });
}

function handleCopy() {
  const text = textarea.value;
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

function handleClear() {
  if (!textarea.value) return;
  applyTextChange(() => '', 'clear');
}

function handleUndo() {
  if (!history.canUndo) return;
  const state = history.undo();
  lastActionWasCleaner = false;
  textarea.value = state ?? '';
  updateStatus();
  updateUndoRedoButtons();
}

function handleRedo() {
  if (!history.canRedo) return;
  const state = history.redo();
  lastActionWasCleaner = false;
  textarea.value = state ?? '';
  updateStatus();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  btnUndo.disabled = !history.canUndo;
  btnRedo.disabled = !history.canRedo;
}

// ── Theme ──

function initTheme() {
  const saved = localStorage.getItem('kb-theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  localStorage.setItem('kb-theme', isLight ? 'light' : 'dark');
}

// ── Status bar ──

function updateStatus() {
  const text = textarea.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split('\n').length : 0;
  statusChars.textContent = `chars: ${chars.toLocaleString()}`;
  statusWords.textContent = `words: ${words.toLocaleString()}`;
  statusLines.textContent = `lines: ${lines.toLocaleString()}`;
}

// ── Filter bar ──

function handleFilter() {
  const query = filterInput.value.toLowerCase().trim();
  const items = cleanerList.querySelectorAll('.cleaner-item');
  for (const item of items) {
    const name = item.textContent.toLowerCase();
    item.classList.toggle('hidden', query && !name.includes(query));
  }
}

// ── Keyboard shortcuts ──

function handleKeydown(e) {
  if (composing || e.isComposing) return;

  const meta = e.metaKey || e.ctrlKey;

  // Cmd+K or / (when not in textarea or filter) → focus filter
  if ((meta && e.key === 'k') || (e.key === '/' && document.activeElement !== textarea && document.activeElement !== filterInput)) {
    e.preventDefault();
    filterInput.focus();
    filterInput.select();
    return;
  }

  // Cmd+F → open find panel
  if (meta && e.key === 'f') {
    e.preventDefault();
    openFindPanel();
    return;
  }

  // Escape → close find panel / clear filter / close mobile sidebar
  if (e.key === 'Escape') {
    if (!findPanel.hidden) {
      closeFindPanel();
      return;
    }
    if (sidebar.classList.contains('open')) {
      closeMobileSidebar();
    } else if (document.activeElement === filterInput) {
      filterInput.value = '';
      handleFilter();
      textarea.focus();
    }
    return;
  }

  // Cmd+Z / Cmd+Shift+Z — intercept only if last action was a cleaner
  if (meta && e.key === 'z') {
    if (lastActionWasCleaner || !textarea.value) {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    }
    // Otherwise let native textarea undo handle it
    return;
  }
}

// ── Paste handling (strip rich text) ──

function handlePasteEvent(e) {
  const text = e.clipboardData?.getData('text/plain');
  if (text !== undefined) {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const prev = textarea.value;
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    if (textarea.value !== prev) {
      if (!history.canUndo && !history.canRedo) {
        history.push(prev, 'initial');
      }
      history.push(textarea.value, 'paste');
      lastActionWasCleaner = true;
      updateStatus();
      updateUndoRedoButtons();
    }
  }
}

// ── Mobile sidebar ──

function openMobileSidebar() {
  sidebar.classList.add('open');
  mobileBackdrop.classList.add('active');
}

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  mobileBackdrop.classList.remove('active');
}

// ── Find & Replace ──

function openFindPanel() {
  findPanel.hidden = false;
  findInput.focus();
  findInput.select();
  updateMatchCount();
}

function closeFindPanel() {
  findPanel.hidden = true;
  findError.hidden = true;
  textarea.focus();
}

function getFindOptions() {
  return {
    regex: findRegex.checked,
    caseSensitive: findCase.checked,
  };
}

function updateMatchCount() {
  const pattern = findInput.value;
  if (!pattern) {
    findMatchCount.textContent = '0 matches';
    findError.hidden = true;
    return;
  }
  try {
    const count = countMatches(textarea.value, pattern, getFindOptions());
    findMatchCount.textContent = `${count} match${count !== 1 ? 'es' : ''}`;
    findError.hidden = true;
  } catch (e) {
    findMatchCount.textContent = '0 matches';
    findError.textContent = e.message;
    findError.hidden = false;
  }
}

function handleReplaceAll() {
  const pattern = findInput.value;
  if (!pattern) return;
  try {
    const replacement = replaceInput.value;
    const options = getFindOptions();
    applyTextChange(text => findReplaceAll(text, pattern, replacement, options), 'replace-all');
    updateMatchCount();
  } catch (e) {
    findError.textContent = e.message;
    findError.hidden = false;
  }
}

// ── IME composition ──

function setupComposition() {
  textarea.addEventListener('compositionstart', () => { composing = true; });
  textarea.addEventListener('compositionend', () => { composing = false; });
}

// ── Init ──

export function init() {
  renderCleanerList();
  initTheme();
  updateStatus();
  updateUndoRedoButtons();
  setupComposition();

  // Toolbar
  btnPaste.addEventListener('click', handlePaste);
  btnCopy.addEventListener('click', handleCopy);
  btnClear.addEventListener('click', handleClear);
  btnUndo.addEventListener('click', handleUndo);
  btnRedo.addEventListener('click', handleRedo);
  themeToggle.addEventListener('click', toggleTheme);

  // Text area
  textarea.addEventListener('input', () => {
    lastActionWasCleaner = false;
    updateStatus();
    if (!findPanel.hidden) updateMatchCount();
  });
  textarea.addEventListener('paste', handlePasteEvent);

  // Filter
  filterInput.addEventListener('input', handleFilter);

  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeydown);

  // Find & Replace
  findInput.addEventListener('input', updateMatchCount);
  findRegex.addEventListener('change', updateMatchCount);
  findCase.addEventListener('change', updateMatchCount);
  btnReplaceAll.addEventListener('click', handleReplaceAll);
  btnFindClose.addEventListener('click', closeFindPanel);

  // Mobile sidebar
  mobileBtn.addEventListener('click', openMobileSidebar);
  mobileBackdrop.addEventListener('click', closeMobileSidebar);
}
