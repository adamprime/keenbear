import {
  applyTextChange,
  handleFilter,
  handlePasteEvent,
  handleRedo,
  handleUndo,
  platform,
  refs,
  renderCleanerList,
  runCleanerByIndex,
  setStatusNote,
  setUiHooks,
  state,
  updateStatus,
  updateUndoRedoButtons,
} from './dom.js';
import { createFindController } from './find.js';
import { createInvisiblesController } from './invisibles.js';
import { createKeydownHandler } from './keyboard.js';
import { createThemeController } from './theme.js';

export function init() {
  const clearFilter = () => {
    refs.filterInput.value = '';
    handleFilter();
  };

  const closeMobileSidebar = () => {
    refs.sidebar.classList.remove('open');
    refs.mobileBackdrop.classList.remove('active');
  };

  const openMobileSidebar = () => {
    refs.sidebar.classList.add('open');
    refs.mobileBackdrop.classList.add('active');
  };

  const handlePaste = () => {
    if (!navigator.clipboard?.readText) return;
    navigator.clipboard.readText().then((text) => {
      if (!text) return;
      applyTextChange(() => text, 'paste');
      refs.textarea.focus();
    }).catch(() => {});
  };

  const handleCopy = () => {
    if (!refs.textarea.value || !navigator.clipboard) return;
    navigator.clipboard.writeText(refs.textarea.value).catch(() => {});
  };

  const handleClear = () => {
    if (!refs.textarea.value) return;
    applyTextChange(() => '', 'clear');
  };

  const handleTextareaInput = () => {
    state.lastActionWasCleaner = false;
    updateStatus();
    if (!refs.findPanel.hidden) find.updateMatchCount();
    if (state.invisiblesActive) invisibles.renderInvisibles();
  };

  const initShortcutBadges = () => {
    document.querySelectorAll('.btn-shortcut').forEach((kbd) => {
      kbd.textContent = platform.isMac ? kbd.dataset.mac : kbd.dataset.other;
    });
  };

  const setupComposition = () => {
    refs.textarea.addEventListener('compositionstart', () => {
      state.composing = true;
    });
    refs.textarea.addEventListener('compositionend', () => {
      state.composing = false;
    });
  };

  const theme = createThemeController({
    body: document.body,
    tagline: refs.tagline,
    textarea: refs.textarea,
    btnPaste: refs.btnPaste,
    btnCopy: refs.btnCopy,
    btnClear: refs.btnClear,
    sidebarTitle: refs.sidebarTitle,
    filterInput: refs.filterInput,
    flavorSelect: refs.flavorSelect,
  });

  const find = createFindController({
    textarea: refs.textarea,
    findPanel: refs.findPanel,
    findInput: refs.findInput,
    replaceInput: refs.replaceInput,
    findRegex: refs.findRegex,
    findCase: refs.findCase,
    findMatchCount: refs.findMatchCount,
    btnReplaceAll: refs.btnReplaceAll,
    btnFindClose: refs.btnFindClose,
    findError: refs.findError,
    applyTextChange,
  });

  const invisibles = createInvisiblesController({
    body: document.body,
    textarea: refs.textarea,
    overlay: refs.invisiblesOverlay,
    button: refs.btnInvisibles,
    state,
    setStatusNote,
  });

  setUiHooks({
    isFindPanelOpen: () => !refs.findPanel.hidden,
    renderInvisibles: invisibles.renderInvisibles,
    updateMatchCount: find.updateMatchCount,
  });

  const handleKeydown = createKeydownHandler({
    isComposing: () => state.composing,
    isFilterFocused: () => document.activeElement === refs.filterInput,
    isTextareaFocused: () => document.activeElement === refs.textarea,
    isFindPanelOpen: () => !refs.findPanel.hidden,
    isSidebarOpen: () => refs.sidebar.classList.contains('open'),
    focusFilter: () => {
      refs.filterInput.focus();
      refs.filterInput.select();
    },
    openFindPanel: find.openFindPanel,
    closeFindPanel: find.closeFindPanel,
    closeMobileSidebar,
    clearFilter,
    focusTextarea: () => refs.textarea.focus(),
    toggleInvisibles: () => invisibles.toggleInvisibles(),
    runCleanerByIndex,
    handleUndo,
    handleRedo,
    shouldInterceptUndo: () => state.lastActionWasCleaner || !refs.textarea.value,
  });

  renderCleanerList();
  theme.initTheme();
  invisibles.initInvisibles();
  initShortcutBadges();
  updateStatus({ force: true });
  updateUndoRedoButtons();
  setupComposition();

  refs.btnPaste.addEventListener('click', handlePaste);
  refs.btnCopy.addEventListener('click', handleCopy);
  refs.btnClear.addEventListener('click', handleClear);
  refs.btnUndo.addEventListener('click', handleUndo);
  refs.btnRedo.addEventListener('click', handleRedo);
  refs.themeToggle.addEventListener('click', theme.toggleTheme);
  refs.btnInvisibles.addEventListener('click', () => invisibles.toggleInvisibles());
  refs.btnFind?.addEventListener('click', find.openFindPanel);

  refs.textarea.addEventListener('input', handleTextareaInput);
  refs.textarea.addEventListener('paste', handlePasteEvent);
  refs.filterInput.addEventListener('input', handleFilter);
  refs.mobileBtn.addEventListener('click', openMobileSidebar);
  refs.mobileBackdrop.addEventListener('click', closeMobileSidebar);

  find.bindEvents();
  window.addEventListener('keydown', handleKeydown);
}
