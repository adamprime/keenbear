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
const flavorSelect = document.getElementById('flavor-select');
const statusChars = document.getElementById('status-chars');
const statusWords = document.getElementById('status-words');
const statusLines = document.getElementById('status-lines');
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('btn-mobile-cleaners');
const mobileBackdrop = document.getElementById('mobile-backdrop');
const btnInvisibles = document.getElementById('btn-invisibles');
const invisiblesOverlay = document.getElementById('invisibles-overlay');
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
  if (invisiblesActive) renderInvisibles();
}

// ── Cleaner list rendering ──

const isMac = navigator.platform?.toUpperCase().includes('MAC') || navigator.userAgent?.includes('Mac');
const modKey = isMac ? '⌥' : 'Alt+';

function renderCleanerList() {
  cleanerList.innerHTML = '';
  cleaners.forEach((cleaner, i) => {
    const li = document.createElement('li');
    li.className = 'cleaner-item';
    li.dataset.id = cleaner.id;
    li.dataset.category = cleaner.category;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = cleaner.name;
    li.appendChild(nameSpan);

    if (i < 9) {
      const kbd = document.createElement('kbd');
      kbd.className = 'cleaner-shortcut';
      kbd.textContent = `${modKey}${i + 1}`;
      li.appendChild(kbd);
    }

    li.addEventListener('click', () => {
      applyTextChange(text => cleaner.fn(text), cleaner.id);
      flashItem(li);
    });
    cleanerList.appendChild(li);
  });
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
  if (invisiblesActive) renderInvisibles();
}

function handleRedo() {
  if (!history.canRedo) return;
  const state = history.redo();
  lastActionWasCleaner = false;
  textarea.value = state ?? '';
  updateStatus();
  updateUndoRedoButtons();
  if (invisiblesActive) renderInvisibles();
}

function updateUndoRedoButtons() {
  btnUndo.disabled = !history.canUndo;
  btnRedo.disabled = !history.canRedo;
}

// ── Theme & Flavor ──

const FLAVORS = {
  hazmat: {
    tagline: 'Decontaminating your clipboard sludge.',
    placeholder: 'Dump your filthy text here...',
    titlePaste: 'Inject (Paste)',
    titleCopy: 'Extract (Copy All)',
    titleClear: 'Incinerate (Clear)',
    sidebarTitle: 'Protocols',
    filterPlaceholder: 'Filter protocols... (⌘K)'
  },
  artisanal: {
    tagline: 'small-batch, locally sourced regex.',
    placeholder: 'gently rest your unrefined thoughts here...',
    titlePaste: 'receive (paste)',
    titleCopy: 'preserve (copy all)',
    titleClear: 'cleanse palette (clear)',
    sidebarTitle: 'treatments',
    filterPlaceholder: 'seek treatment... (⌘K)'
  },
  butler: {
    tagline: 'Because frankly, your formatting is an embarrassment.',
    placeholder: 'Please present the text requiring... refinement.',
    titlePaste: 'Accept (Paste)',
    titleCopy: 'Transcribe (Copy All)',
    titleClear: 'Dispose (Clear)',
    sidebarTitle: 'Services',
    filterPlaceholder: 'Request service... (⌘K)'
  },
  y2k: {
    tagline: 'EVALUATION COPY - 30 DAYS REMAINING',
    placeholder: 'C:\\> PASTE_TEXT.EXE',
    titlePaste: 'Paste',
    titleCopy: 'Copy All',
    titleClear: 'Format C: (Clear)',
    sidebarTitle: 'Toolbox',
    filterPlaceholder: 'Search... (⌘K)'
  },
  pirate: {
    tagline: 'Arr! Swab yer clipboard, ye filthy landlubber.',
    placeholder: 'Dump yer plunder here, Captain...',
    titlePaste: 'Haul Aboard (Paste)',
    titleCopy: 'Plunder (Copy All)',
    titleClear: 'Scuttle (Clear)',
    sidebarTitle: 'Yer Arsenal',
    filterPlaceholder: 'Search the hold... (⌘K)'
  }
};

function initTheme() {
  const savedTheme = localStorage.getItem('kb-theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  const savedFlavor = localStorage.getItem('kb-flavor') || 'pirate';
  flavorSelect.value = savedFlavor;
  applyFlavor(savedFlavor);

  flavorSelect.addEventListener('change', (e) => {
    applyFlavor(e.target.value);
  });
}

function setButtonLabel(btn, label) {
  const textNode = Array.from(btn.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = label + ' ';
  } else {
    btn.insertBefore(document.createTextNode(label + ' '), btn.firstChild);
  }
}

function applyFlavor(flavorId) {
  // Remove existing flavor classes
  document.body.classList.remove('flavor-hazmat', 'flavor-artisanal', 'flavor-butler', 'flavor-y2k', 'flavor-pirate');
  document.body.classList.add(`flavor-${flavorId}`);
  localStorage.setItem('kb-flavor', flavorId);

  // Update verbiage
  const texts = FLAVORS[flavorId];
  if (!texts) return;

  document.getElementById('tagline').textContent = texts.tagline;
  textarea.placeholder = texts.placeholder;
  
  // Standard labels, theme-specific tooltips (preserve kbd children)
  setButtonLabel(btnPaste, 'Paste');
  setButtonLabel(btnCopy, 'Copy All');
  setButtonLabel(btnClear, 'Clear');
  
  btnPaste.title = texts.titlePaste;
  btnCopy.title = texts.titleCopy;
  btnClear.title = texts.titleClear;
  
  const sidebarTitle = document.querySelector('.sidebar-title');
  if (sidebarTitle) sidebarTitle.textContent = texts.sidebarTitle;
  
  filterInput.placeholder = texts.filterPlaceholder;
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

  // Alt/Option+0 → toggle show invisibles
  if (e.altKey && e.code === 'Digit0') {
    e.preventDefault();
    toggleInvisibles();
    return;
  }

  // Alt/Option+1-9 → run cleaner by position
  if (e.altKey && e.code >= 'Digit1' && e.code <= 'Digit9') {
    e.preventDefault();
    const index = parseInt(e.code.slice(-1)) - 1;
    if (index < cleaners.length) {
      const cleaner = cleaners[index];
      applyTextChange(text => cleaner.fn(text), cleaner.id);
      const items = cleanerList.querySelectorAll('.cleaner-item');
      if (items[index]) flashItem(items[index]);
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
      if (invisiblesActive) renderInvisibles();
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

// ── Show Invisibles ──

let invisiblesActive = false;
let rafId = null;

function initInvisibles() {
  const saved = localStorage.getItem('kb-invisibles');
  if (saved === 'true') {
    toggleInvisibles(true);
  }
}

function toggleInvisibles(force) {
  invisiblesActive = force !== undefined ? force : !invisiblesActive;
  document.body.classList.toggle('show-invisibles', invisiblesActive);
  btnInvisibles.classList.toggle('active', invisiblesActive);
  localStorage.setItem('kb-invisibles', invisiblesActive);
  if (invisiblesActive) {
    renderInvisibles();
    syncScroll();
  } else {
    cancelAnimationFrame(rafId);
    invisiblesOverlay.textContent = '';
  }
}

function renderInvisibles() {
  const text = textarea.value;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') {
      const span = document.createElement('span');
      span.className = 'inv-space';
      span.textContent = '\u00B7'; // middle dot
      frag.appendChild(span);
    } else if (ch === '\t') {
      const span = document.createElement('span');
      span.className = 'inv-tab';
      span.textContent = '\u2192\t'; // arrow + tab for spacing
      frag.appendChild(span);
    } else if (ch === '\n') {
      const span = document.createElement('span');
      span.className = 'inv-newline';
      span.textContent = '\u00B6'; // pilcrow
      frag.appendChild(span);
      frag.appendChild(document.createTextNode('\n'));
    } else {
      frag.appendChild(document.createTextNode(ch));
    }
  }

  invisiblesOverlay.textContent = '';
  invisiblesOverlay.appendChild(frag);
}

function syncScroll() {
  if (!invisiblesActive) return;
  invisiblesOverlay.scrollTop = textarea.scrollTop;
  invisiblesOverlay.scrollLeft = textarea.scrollLeft;
  rafId = requestAnimationFrame(syncScroll);
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

function initShortcutBadges() {
  document.querySelectorAll('.btn-shortcut').forEach(kbd => {
    kbd.textContent = isMac ? kbd.dataset.mac : kbd.dataset.other;
  });
}

export function init() {
  renderCleanerList();
  initTheme();
  initInvisibles();
  initShortcutBadges();
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
  btnInvisibles.addEventListener('click', () => toggleInvisibles());

  // Text area
  textarea.addEventListener('input', () => {
    lastActionWasCleaner = false;
    updateStatus();
    if (!findPanel.hidden) updateMatchCount();
    if (invisiblesActive) renderInvisibles();
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
