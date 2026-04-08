import { FLAVORS } from './flavors.js';

const FLAVOR_CLASSES = ['flavor-hazmat', 'flavor-artisanal', 'flavor-butler', 'flavor-y2k', 'flavor-pirate'];

function setButtonLabel(button, label) {
  const textNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = `${label} `;
    return;
  }
  button.insertBefore(document.createTextNode(`${label} `), button.firstChild);
}

export function createThemeController({
  body,
  tagline,
  textarea,
  btnPaste,
  btnCopy,
  btnClear,
  sidebarTitle,
  filterInput,
  flavorSelect,
}) {
  function applyFlavor(flavorId) {
    body.classList.remove(...FLAVOR_CLASSES);
    body.classList.add(`flavor-${flavorId}`);
    localStorage.setItem('kb-flavor', flavorId);

    const texts = FLAVORS[flavorId];
    if (!texts) return;

    tagline.textContent = texts.tagline;
    textarea.placeholder = texts.placeholder;

    setButtonLabel(btnPaste, 'Paste');
    setButtonLabel(btnCopy, 'Copy All');
    setButtonLabel(btnClear, 'Clear');

    btnPaste.title = texts.titlePaste;
    btnCopy.title = texts.titleCopy;
    btnClear.title = texts.titleClear;
    sidebarTitle.textContent = texts.sidebarTitle;
    filterInput.placeholder = texts.filterPlaceholder;
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('kb-theme');
    body.classList.toggle('light-mode', savedTheme === 'light');

    const savedFlavor = localStorage.getItem('kb-flavor') || 'pirate';
    flavorSelect.value = savedFlavor;
    applyFlavor(savedFlavor);

    flavorSelect.addEventListener('change', (event) => {
      applyFlavor(event.target.value);
    });
  }

  function toggleTheme() {
    body.classList.toggle('light-mode');
    localStorage.setItem('kb-theme', body.classList.contains('light-mode') ? 'light' : 'dark');
  }

  return { applyFlavor, initTheme, toggleTheme };
}
