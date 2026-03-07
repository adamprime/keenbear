export class History {
  #undoStack = [];
  #redoStack = [];
  #maxDepth;

  constructor(maxDepth = 20) {
    this.#maxDepth = maxDepth;
  }

  get canUndo() {
    return this.#undoStack.length > 0;
  }

  get canRedo() {
    return this.#redoStack.length > 0;
  }

  push(state, source = null) {
    if (this.#undoStack.length > 0 && this.#undoStack[this.#undoStack.length - 1].text === state) {
      return;
    }

    this.#undoStack.push({ text: state, source });
    this.#redoStack.length = 0;

    if (this.#undoStack.length > this.#maxDepth) {
      this.#undoStack.shift();
    }
  }

  undo() {
    if (!this.canUndo) return null;
    const state = this.#undoStack.pop();
    this.#redoStack.push(state);
    return this.#undoStack.length > 0 ? this.#undoStack[this.#undoStack.length - 1].text : null;
  }

  redo() {
    if (!this.canRedo) return null;
    const state = this.#redoStack.pop();
    this.#undoStack.push(state);
    return state.text;
  }

  clear() {
    this.#undoStack.length = 0;
    this.#redoStack.length = 0;
  }
}
