export class ExecutionFlowManager {
  /**
   * Stores execution context values and optional cleanup callbacks.
   */
  constructor() {
    this._ctx = new Map();
    this.cleanupSteps = new Map();
  }

  /**
   * Exposes the mutable context map.
   *
   * @returns {Map<string, any>}
   */
  get context() {
    return this._ctx;
  }

  /**
   * Saves a value in context and registers an optional cleanup callback.
   *
   * @param {string} key - Context key.
   * @param {any} value - Value to store.
   * @param {(value: any) => void} [cleanupFn] - Cleanup callback for this key.
   * @returns {ExecutionFlowManager}
   */
  set(key, value, cleanupFn) {
    this.context.set(key, value);

    if (cleanupFn) {
      this.cleanupSteps.set(key, () => cleanupFn(value));
    }
    return this;
  }

  /**
   * Returns a plain object snapshot of current context.
   *
   * @returns {Record<string, any>}
   */
  ctx() {
    return Object.fromEntries(this.context);
  }

  /**
   * Gets a value from context by key.
   *
   * @param {string} key - Context key.
   * @returns {any}
   */
  get(key) {
    return this.context.get(key);
  }

  /**
   * Adds a chained Cypress step with access to the manager instance.
   *
   * @param {(flow: ExecutionFlowManager) => any} callback - Step callback.
   * @returns {ExecutionFlowManager}
   */
  step(callback) {
    cy.then(() => {
      return callback(this);
    });

    return this;
  }

  /**
   * Executes registered cleanup callbacks in reverse registration order.
   * Clears context and cleanup steps after execution.
   *
   * @returns {void}
   */
  cleanup() {
    cy.then(() => {
      const keys = Array.from(this.cleanupSteps.keys()).reverse();

      keys.forEach((key) => {
        this.cleanupSteps.get(key)(this.context);
      });

      this.cleanupSteps.clear();
      this.context.clear();
    });
  }
}
