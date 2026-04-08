function isMetaKey(event) {
  return event.metaKey || event.ctrlKey;
}

function isCleanerShortcut(code) {
  return code >= 'Digit1' && code <= 'Digit9';
}

export function createKeydownHandler({
  isComposing,
  isFilterFocused,
  isTextareaFocused,
  isFindPanelOpen,
  isSidebarOpen,
  focusFilter,
  openFindPanel,
  closeFindPanel,
  closeMobileSidebar,
  clearFilter,
  focusTextarea,
  toggleInvisibles,
  runCleanerByIndex,
  handleUndo,
  handleRedo,
  shouldInterceptUndo,
}) {
  return function handleKeydown(event) {
    if (isComposing() || event.isComposing) return;

    const meta = isMetaKey(event);

    if ((meta && event.key === 'k') || (event.key === '/' && !isTextareaFocused() && !isFilterFocused())) {
      event.preventDefault();
      focusFilter();
      return;
    }

    if (meta && event.key === 'f') {
      event.preventDefault();
      openFindPanel();
      return;
    }

    if (event.key === 'Escape') {
      if (isFindPanelOpen()) {
        closeFindPanel();
        return;
      }
      if (isSidebarOpen()) {
        closeMobileSidebar();
      } else if (isFilterFocused()) {
        clearFilter();
        focusTextarea();
      }
      return;
    }

    if (event.altKey && event.code === 'Digit0') {
      event.preventDefault();
      toggleInvisibles();
      return;
    }

    if (event.altKey && isCleanerShortcut(event.code)) {
      event.preventDefault();
      runCleanerByIndex(Number.parseInt(event.code.slice(-1), 10) - 1);
      return;
    }

    if (meta && event.key === 'z') {
      if (shouldInterceptUndo()) {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    }
  };
}
