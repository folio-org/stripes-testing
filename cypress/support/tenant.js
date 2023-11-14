export default class Tenant {
  static #tenant = Cypress.env('OKAPI_TENANT');

  static get() {
    return this.#tenant;
  }

  static set(value) {
    this.#tenant = value;
  }

  static resetToDefault() {
    this.#tenant = Cypress.env('OKAPI_TENANT');
  }
}

Cypress.Commands.add('setTenant', (tenant) => {
  Tenant.set(tenant);
});

Cypress.Commands.add('resetTenant', () => {
  Tenant.resetToDefault();
});
