import { countMatches, replaceAll as findReplaceAll } from '../find-replace.js';

export function createFindController({
  textarea,
  findPanel,
  findInput,
  replaceInput,
  findRegex,
  findCase,
  findMatchCount,
  btnReplaceAll,
  btnFindClose,
  findError,
  applyTextChange,
}) {
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
    } catch (error) {
      findMatchCount.textContent = '0 matches';
      findError.textContent = error.message;
      findError.hidden = false;
    }
  }

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

  function handleReplaceAll() {
    const pattern = findInput.value;
    if (!pattern) return;

    try {
      applyTextChange(
        (text) => findReplaceAll(text, pattern, replaceInput.value, getFindOptions()),
        'replace-all'
      );
      updateMatchCount();
    } catch (error) {
      findError.textContent = error.message;
      findError.hidden = false;
    }
  }

  function bindEvents() {
    findInput.addEventListener('input', updateMatchCount);
    findRegex.addEventListener('change', updateMatchCount);
    findCase.addEventListener('change', updateMatchCount);
    btnReplaceAll.addEventListener('click', handleReplaceAll);
    btnFindClose.addEventListener('click', closeFindPanel);
  }

  return { bindEvents, closeFindPanel, openFindPanel, updateMatchCount };
}
