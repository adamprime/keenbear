const scheduleIdle = globalThis.requestIdleCallback
  ? (callback) => globalThis.requestIdleCallback(callback, { timeout: 200 })
  : (callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0);

const cancelIdle = globalThis.cancelIdleCallback
  ? globalThis.cancelIdleCallback.bind(globalThis)
  : globalThis.clearTimeout.bind(globalThis);

export const MAX_INVISIBLES_LENGTH = 100_000;

export function renderInvisiblesString(text) {
  if (!text) return '';
  return text
    .replace(/ /g, '\u00B7')
    .replace(/\n/g, '\u00B6\n');
}

function createMarkerTemplate(documentRef, className, text) {
  const span = documentRef.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

export function createInvisiblesController({
  body,
  textarea,
  overlay,
  button,
  state,
  setStatusNote,
}) {
  const documentRef = overlay.ownerDocument;
  const templates = {
    space: createMarkerTemplate(documentRef, 'inv-space', '\u00B7'),
    tab: createMarkerTemplate(documentRef, 'inv-tab', '\t'),
    newline: createMarkerTemplate(documentRef, 'inv-newline', '\u00B6'),
  };

  let idleId = null;
  let scrollBound = false;

  function syncScroll() {
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }

  function bindScroll() {
    if (scrollBound) return;
    textarea.addEventListener('scroll', syncScroll, { passive: true });
    scrollBound = true;
  }

  function unbindScroll() {
    if (!scrollBound) return;
    textarea.removeEventListener('scroll', syncScroll);
    scrollBound = false;
  }

  function clearScheduledRender() {
    if (idleId === null) return;
    cancelIdle(idleId);
    idleId = null;
  }

  function disableForLargeDocument() {
    state.invisiblesActive = false;
    body.classList.remove('show-invisibles');
    button.classList.remove('active');
    localStorage.setItem('kb-invisibles', 'false');
    overlay.replaceChildren();
    clearScheduledRender();
    unbindScroll();
    setStatusNote('Invisibles auto-disabled for large documents.');
  }

  function renderInvisiblesNow() {
    if (!state.invisiblesActive) return;

    const text = textarea.value;
    if (text.length > MAX_INVISIBLES_LENGTH) {
      disableForLargeDocument();
      return;
    }

    const fragment = documentRef.createDocumentFragment();
    let visibleRun = '';

    const flushVisibleRun = () => {
      if (!visibleRun) return;
      fragment.appendChild(documentRef.createTextNode(visibleRun));
      visibleRun = '';
    };

    for (const char of text) {
      if (char === ' ') {
        flushVisibleRun();
        fragment.appendChild(templates.space.cloneNode(true));
      } else if (char === '\t') {
        flushVisibleRun();
        fragment.appendChild(templates.tab.cloneNode(true));
      } else if (char === '\n') {
        flushVisibleRun();
        fragment.appendChild(templates.newline.cloneNode(true));
        fragment.appendChild(documentRef.createTextNode('\n'));
      } else {
        visibleRun += char;
      }
    }

    flushVisibleRun();
    overlay.replaceChildren(fragment);
    syncScroll();
    setStatusNote('');
  }

  function renderInvisibles() {
    if (!state.invisiblesActive || idleId !== null) return;
    idleId = scheduleIdle(() => {
      idleId = null;
      renderInvisiblesNow();
    });
  }

  function toggleInvisibles(force) {
    const next = force !== undefined ? force : !state.invisiblesActive;
    if (next && textarea.value.length > MAX_INVISIBLES_LENGTH) {
      disableForLargeDocument();
      return false;
    }

    state.invisiblesActive = next;
    body.classList.toggle('show-invisibles', next);
    button.classList.toggle('active', next);
    localStorage.setItem('kb-invisibles', next ? 'true' : 'false');

    if (next) {
      setStatusNote('');
      bindScroll();
      renderInvisibles();
      return true;
    }

    clearScheduledRender();
    unbindScroll();
    overlay.replaceChildren();
    setStatusNote('');
    return false;
  }

  function initInvisibles() {
    if (localStorage.getItem('kb-invisibles') === 'true') {
      toggleInvisibles(true);
    }
  }

  return { initInvisibles, renderInvisibles, syncScroll, toggleInvisibles };
}
