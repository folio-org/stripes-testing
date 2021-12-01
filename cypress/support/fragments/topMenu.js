import { Button } from '../../../interactors';

export default class TopMenu {
  static #agreements = Button('Agreements');

  // direct paths to folio apps to use in cy.visit() into initial steps of our scenarios
  // TODO: methods like openAgreements() with interactors and selectors should be used into separated scenarios related with TopMenu implementation
  static agreementsPath = '/erm/agreements';
  static inventoryPath = '/inventory';
  static settingsDataImportPath = '/settings/data-import/mapping-profiles';

  static openAgreements() {
    cy.do(this.#agreements.click());
  }
}
