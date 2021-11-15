import { Button } from '../../../../interactors';

export default class Actions {
  static #actions = Button('Actions');
  static saveUUIDOption = '#dropdown-clickable-get-items-uiids';
  static saveCQLQueryOption = '#dropdown-clickable-get-cql-query';
  static exportMARCOption = '#dropdown-clickable-export-marc';
  static showSelectedRecordsOption = '#dropdown-clickable-show-selected-records';


  static openActions() {
    cy.do(this.#actions.click());
  }

  static optionIsDisabled(selector, disabled) {
    cy.get(selector)
      .invoke('prop', 'disabled')
      .should('eq', disabled);
  }
}
