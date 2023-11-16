export default class Tenant {
  static #tenant = Cypress.env('token');

  static get() {
    return this.#tenant;
  }

  static set(value) {
    this.#tenant = value;
  }

  static resetToDefault() {
    this.#tenant = Cypress.env('token');
  }
}
