import { Button, Select, TextField, TextInput } from '../../../../interactors';
import NewInventoryInstance from './newInventoryInstance';

export default class Actions {
  static #actions = Button('Actions');
  static saveUUIDOption = '#dropdown-clickable-get-items-uiids';
  static saveCQLQueryOption = '#dropdown-clickable-get-cql-query';
  static exportMARCOption = '#dropdown-clickable-export-marc';
  static showSelectedRecordsOption = '#dropdown-clickable-show-selected-records';
  static #importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
  static #importButtonInModal = Button('Import');
  static #OCLWorldCatIdentifierTextField = TextField('Enter OCLC WorldCat identifier');
  static #importTypeSelect = Select({ name :'externalIdentifierType' });



  static open() {
    return cy.do(this.#actions.click());
  }

  static optionIsDisabled(selector, disabled) {
    return cy.get(selector)
      .invoke('prop', 'disabled')
      .should('eq', disabled);
  }

  static import(specialOCLCWorldCatidentifier = NewInventoryInstance.validOCLC) {
    this.open();
    cy.do(this.#importButtonInActions.click());

    if (Cypress.env('is_kiwi_release')) {
      const oclcWorldCat = { text:'OCLC WorldCat',
        value : '6f171ee7-7a0a-4dd4-8959-bd67ec07cc88' };

      cy.do(this.#importTypeSelect.choose(oclcWorldCat.text));
      cy.expect(this.#importTypeSelect.has({ value: oclcWorldCat.value }));
    }

    cy.do(this.#OCLWorldCatIdentifierTextField.fillIn(specialOCLCWorldCatidentifier));
    cy.do(this.#importButtonInModal.click());

    NewInventoryInstance.checkExpectedOCLCPresence(specialOCLCWorldCatidentifier);
  }
}
