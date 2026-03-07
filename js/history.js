export class History {
  #states = [];
  #index = -1;
  #maxDepth;

  constructor(maxDepth = 20) {
    this.#maxDepth = maxDepth;
  }

  get canUndo() {
    return this.#index > 0;
  }

  get canRedo() {
    return this.#index < this.#states.length - 1;
  }

  push(state, source = null) {
    if (this.#index >= 0 && this.#states[this.#index].text === state) {
      return;
    }

    // Truncate any redo states
    this.#states.length = this.#index + 1;
    this.#states.push({ text: state, source });
    this.#index = this.#states.length - 1;

    // Enforce max depth
    if (this.#states.length > this.#maxDepth + 1) {
      this.#states.shift();
      this.#index--;
    }
  }

  undo() {
    if (!this.canUndo) return null;
    this.#index--;
    return this.#states[this.#index].text;
  }

  redo() {
    if (!this.canRedo) return null;
    this.#index++;
    return this.#states[this.#index].text;
  }

  clear() {
    this.#states.length = 0;
    this.#index = -1;
  }
}
