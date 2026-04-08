import { createKeydownHandler } from '../js/ui/keyboard.js';

function makeEvent(overrides = {}) {
  return {
    key: '',
    code: '',
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    isComposing: false,
    preventDefaultCalled: false,
    preventDefault() {
      this.preventDefaultCalled = true;
    },
    ...overrides,
  };
}

describe('createKeydownHandler', () => {
  it('runs the first cleaner for Alt+Digit1', () => {
    const calls = [];
    const handleKeydown = createKeydownHandler({
      isComposing: () => false,
      isFilterFocused: () => false,
      isTextareaFocused: () => false,
      isFindPanelOpen: () => false,
      isSidebarOpen: () => false,
      focusFilter: () => calls.push('focus-filter'),
      openFindPanel: () => calls.push('open-find'),
      closeFindPanel: () => calls.push('close-find'),
      closeMobileSidebar: () => calls.push('close-sidebar'),
      clearFilter: () => calls.push('clear-filter'),
      focusTextarea: () => calls.push('focus-textarea'),
      toggleInvisibles: () => calls.push('toggle-invisibles'),
      runCleanerByIndex: (index) => calls.push(`cleaner:${index}`),
      handleUndo: () => calls.push('undo'),
      handleRedo: () => calls.push('redo'),
      shouldInterceptUndo: () => false,
    });

    const event = makeEvent({ altKey: true, code: 'Digit1' });
    handleKeydown(event);

    assert.deepEqual(calls, ['cleaner:0']);
    assert.ok(event.preventDefaultCalled);
  });

  it('toggles invisibles for Alt+Digit0', () => {
    const calls = [];
    const handleKeydown = createKeydownHandler({
      isComposing: () => false,
      isFilterFocused: () => false,
      isTextareaFocused: () => false,
      isFindPanelOpen: () => false,
      isSidebarOpen: () => false,
      focusFilter: () => {},
      openFindPanel: () => {},
      closeFindPanel: () => {},
      closeMobileSidebar: () => {},
      clearFilter: () => {},
      focusTextarea: () => {},
      toggleInvisibles: () => calls.push('toggle'),
      runCleanerByIndex: () => {},
      handleUndo: () => {},
      handleRedo: () => {},
      shouldInterceptUndo: () => false,
    });

    const event = makeEvent({ altKey: true, code: 'Digit0' });
    handleKeydown(event);

    assert.deepEqual(calls, ['toggle']);
    assert.ok(event.preventDefaultCalled);
  });

  it('ignores composed Alt characters when the physical key is not a digit', () => {
    const calls = [];
    const handleKeydown = createKeydownHandler({
      isComposing: () => false,
      isFilterFocused: () => false,
      isTextareaFocused: () => false,
      isFindPanelOpen: () => false,
      isSidebarOpen: () => false,
      focusFilter: () => {},
      openFindPanel: () => {},
      closeFindPanel: () => {},
      closeMobileSidebar: () => {},
      clearFilter: () => {},
      focusTextarea: () => {},
      toggleInvisibles: () => calls.push('toggle'),
      runCleanerByIndex: () => calls.push('cleaner'),
      handleUndo: () => {},
      handleRedo: () => {},
      shouldInterceptUndo: () => false,
    });

    const event = makeEvent({ altKey: true, key: '¡', code: 'KeyA' });
    handleKeydown(event);

    assert.deepEqual(calls, []);
    assert.ok(!event.preventDefaultCalled);
  });

  it('opens the find panel for Cmd+F', () => {
    const calls = [];
    const handleKeydown = createKeydownHandler({
      isComposing: () => false,
      isFilterFocused: () => false,
      isTextareaFocused: () => false,
      isFindPanelOpen: () => false,
      isSidebarOpen: () => false,
      focusFilter: () => {},
      openFindPanel: () => calls.push('open-find'),
      closeFindPanel: () => {},
      closeMobileSidebar: () => {},
      clearFilter: () => {},
      focusTextarea: () => {},
      toggleInvisibles: () => {},
      runCleanerByIndex: () => {},
      handleUndo: () => {},
      handleRedo: () => {},
      shouldInterceptUndo: () => false,
    });

    const event = makeEvent({ metaKey: true, key: 'f' });
    handleKeydown(event);

    assert.deepEqual(calls, ['open-find']);
    assert.ok(event.preventDefaultCalled);
  });

  it('closes the find panel on Escape when open', () => {
    const calls = [];
    const handleKeydown = createKeydownHandler({
      isComposing: () => false,
      isFilterFocused: () => false,
      isTextareaFocused: () => false,
      isFindPanelOpen: () => true,
      isSidebarOpen: () => false,
      focusFilter: () => {},
      openFindPanel: () => {},
      closeFindPanel: () => calls.push('close-find'),
      closeMobileSidebar: () => {},
      clearFilter: () => {},
      focusTextarea: () => {},
      toggleInvisibles: () => {},
      runCleanerByIndex: () => {},
      handleUndo: () => {},
      handleRedo: () => {},
      shouldInterceptUndo: () => false,
    });

    handleKeydown(makeEvent({ key: 'Escape' }));

    assert.deepEqual(calls, ['close-find']);
  });
});
