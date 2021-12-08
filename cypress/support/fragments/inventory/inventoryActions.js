import { Button, Select, TextField } from '../../../../interactors';
import InventoryInstance from './inventoryInstance';

const importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
const importButtonInModal = Button('Import');
const OCLWorldCatIdentifierTextField = TextField({ name: 'externalIdentifier' });
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

  import(specialOCLCWorldCatidentifier = InventoryInstance.validOCLC.id) {
    cy.do(this.open());
    cy.do(importButtonInActions.click());
    this.fillImportFields(specialOCLCWorldCatidentifier);

    this.pressImportInModal();
    InventoryInstance.checkExpectedOCLCPresence(specialOCLCWorldCatidentifier);
    InventoryInstance.checkExpectedMARCSource();
  },

  // the same steps can be used in Overlay Source Bibliographic Record
  fillImportFields(specialOCLCWorldCatidentifier = InventoryInstance.validOCLC.id) {
    // TODO: remove in the future, now related with differenes in our environments
    if (Cypress.env('is_kiwi_release')) {
      const oclcWorldCat = { text:'OCLC WorldCat',
        value : '6f171ee7-7a0a-4dd4-8959-bd67ec07cc88' };

      cy.do(importTypeSelect.choose(oclcWorldCat.text));
      cy.expect(importTypeSelect.has({ value: oclcWorldCat.value }));
    }

    cy.do(OCLWorldCatIdentifierTextField.fillIn(specialOCLCWorldCatidentifier));
  },

  pressImportInModal() {
    cy.do(importButtonInModal.click());
  },

  verifySaveUUIDsFileName(actualName) {
    // Check naming mask
    const expectedFileNameMask = /SearchInstanceUUIDs\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    // Check date value
    const dateString = actualName.split('/');
    const actualDate = Date.parse(dateString[dateString.length - 1].slice(19, 38).replaceAll('_', ':'));
    expect(actualDate).to.be.greaterThan(Date.now() - 100000);
    expect(actualDate).to.be.lessThan(Date.now() + 100000);
  },
  // TODO: check work in test cypress\integration\inventory\export.spec.js
  verifySavedUUIDs(actualUUIDs, expectedUUIDs) {
    expect(actualUUIDs.replaceAll('"', '').split('\n')).to.eql(expectedUUIDs);
  }
};
