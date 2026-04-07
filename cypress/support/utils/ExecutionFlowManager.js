export class ExecutionFlowManager {
  constructor() {
    this._ctx = new Map();
    this.cleanupSteps = new Map();
  }

  get context() {
    return this._ctx;
  }

  set(key, value, cleanupFn) {
    this.context.set(key, value);

    if (cleanupFn) {
      this.cleanupSteps.set(key, () => cleanupFn(value));
    }
    return this;
  }

  ctx() {
    return Object.fromEntries(this.context);
  }

  get(key) {
    return this.context.get(key);
  }

  step(callback) {
    cy.then(() => {
      return callback(this);
    });

    return this;
  }

  cleanup() {
    cy.then(() => {
      const keys = Array.from(this.cleanupSteps.keys()).reverse();

      keys.forEach((key) => {
        this.cleanupSteps.get(key)(this.context);
      });
    });
  }
}
