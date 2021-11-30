import { Button , Select, TextField, TextInput} from '../../../../interactors';
import NewInventoryInstance from './newInventoryInstance';

export default class InventoryActions {
  static #actions = Button('Actions');
  static #saveUUIDsOption = Button('Save instances UUIDs');
  static #saveCQLQueryOption = Button('Save instances CQL query');
  static #exportMARCOption = Button('Export instances (MARC)');
  static #showSelectedRecordsOption = Button('Show selected records');
  static #importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
  static #importButtonInModal = Button('Import');
  static #OCLWorldCatIdentifierTextField = TextField('Enter OCLC WorldCat identifier');
  static #importTypeSelect = Select({ name :'externalIdentifierType' });


  static open() {
    return this.#actions.click();
  }

  static saveUUIDsOption() {
    return this.#saveUUIDsOption;
  }

  static saveCQLQueryOption() {
    return this.#saveCQLQueryOption;
  }

  static exportMARCOption() {
    return this.#exportMARCOption;
  }

  static showSelectedRecordsOption() {
    return this.#showSelectedRecordsOption;
  }

  static optionsIsDisabled(array) {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: true }));
    });
  }

  static optionsIsEnabled(array) {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: false }));
    });
  }

  static import(specialOCLCWorldCatidentifier = NewInventoryInstance.validOCLC) {
    cy.do(this.open());
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
