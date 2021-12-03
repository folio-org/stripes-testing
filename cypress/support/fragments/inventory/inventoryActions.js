import { Button, Select, TextField } from '../../../../interactors';
import NewInventoryInstance from './newInventoryInstance';

const importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
const importButtonInModal = Button('Import');
const OCLWorldCatIdentifierTextField = TextField('Enter OCLC WorldCat identifier');
const importTypeSelect = Select({ name :'externalIdentifierType' });

export default {
  open: () => { return Button('Actions').click(); },
  options: {
    saveUUIDs: Button('Save instances UUIDs'),
    saveCQLQuery: Button('Save instances CQL query'),
    exportMARC: Button('Export instances (MARC)'),
    showSelectedRecords: Button('Show selected records'),
  },
  optionsIsDisabled: (array) => {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: true }));
    });
  },
  optionsIsEnabled: (array) => {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: false }));
    });
  },

  import(specialOCLCWorldCatidentifier = NewInventoryInstance.validOCLC.id) {
    cy.do(this.open());
    cy.do(importButtonInActions.click());

    // TODO: remove in the future, now related with differenes in our environments
    if (Cypress.env('is_kiwi_release')) {
      const oclcWorldCat = { text:'OCLC WorldCat',
        value : '6f171ee7-7a0a-4dd4-8959-bd67ec07cc88' };

      cy.do(importTypeSelect.choose(oclcWorldCat.text));
      cy.expect(importTypeSelect.has({ value: oclcWorldCat.value }));
    }

    cy.do(OCLWorldCatIdentifierTextField.fillIn(specialOCLCWorldCatidentifier));
    cy.do(importButtonInModal.click());

    NewInventoryInstance.checkExpectedOCLCPresence(specialOCLCWorldCatidentifier);
  }
};
