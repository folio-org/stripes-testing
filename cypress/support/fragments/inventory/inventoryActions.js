import { Button, Section, Select, TextField } from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import InventoryInstance from './inventoryInstance';
import FileManager from '../../utils/fileManager';
import InteractorsTools from '../../utils/interactorsTools';

const importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
const importButtonInModal = Button('Import');
const OCLWorldCatIdentifierTextField = TextField({ name: 'externalIdentifier' });
const importTypeSelect = Select({ name :'externalIdentifierType' });

// TODO: merge inventoryACtions and InventoryInstances
export default {
  open: () => { return Section({ id:'pane-results' }).find(Button('Actions')).click(); },
  options: {
    new: Button('New'),
    saveUUIDs: Button('Save instances UUIDs'),
    saveCQLQuery: Button('Save instances CQL query'),
    exportMARC: Button('Export instances (MARC)'),
    showSelectedRecords: Button('Show selected records'),
    newRequest: Button('New Request')
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
    cy.expect(OCLWorldCatIdentifierTextField.exists());
    this.fillImportFields(specialOCLCWorldCatidentifier);

    this.pressImportInModal();
    InteractorsTools.closeCalloutMessage();
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

  pressImportInModal(specialOCLCWorldCatidentifier = InventoryInstance.validOCLC.id) {
    cy.do(importButtonInModal.click());
    InventoryInstance.checkExpectedOCLCPresence(specialOCLCWorldCatidentifier);
  },
  verifySaveUUIDsFileName(actualName) {
    // valid name example: SearchInstanceUUIDs2021-11-18T16_39_59+03_00.csv
    const expectedFileNameMask = /SearchInstanceUUIDs\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const actualDate = DateTools.parseDateFromFilename(FileManager.getFileNameFromFilePath(actualName));
    DateTools.verifyDate(actualDate);
  },

  verifySavedUUIDs(actualUUIDs, expectedUUIDs) {
    const formattedActualUUIDs = actualUUIDs.replaceAll('"', '').split('\n');
    expect(expectedUUIDs).to.deep.equal(formattedActualUUIDs);
  },

  verifySaveCQLQueryFileName(actualName) {
    // valid name example: SearchInstanceCQLQuery2021-12-09T14_45_54+03_00.cql
    const expectedFileNameMask = /SearchInstanceCQLQuery\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.cql/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const actualDate = DateTools.parseDateFromFilename(FileManager.getFileNameFromFilePath(actualName));
    DateTools.verifyDate(actualDate);
  },

  verifySaveCQLQuery(actualQuery, kw = '*', lang = 'eng') {
    cy.url().then((url) => {
      const params = new URLSearchParams(url.split('?')[1]);
      const effectiveLocationId = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/gm.exec(params.get('filters'))[0];
      const expectedText = `((keyword all "${kw}") and languages=="${lang}" and items.effectiveLocationId=="${effectiveLocationId}") sortby title`;
      expect(actualQuery).to.eq(expectedText);
    });
  },

  verifyInstancesMARCFileName(actualName) {
    // valid name example: QuickInstanceExport2021-12-24T14_05_53+03_00.csv
    const expectedFileNameMask = /QuickInstanceExport\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const actualDate = DateTools.parseDateFromFilename(FileManager.getFileNameFromFilePath(actualName));
    DateTools.verifyDate(actualDate);
  },

  verifyInstancesMARC(actualIDs, expectedIDs) {
    const formattedActualUUIDs = actualIDs.replaceAll('"', '').split('\n');
    expect(expectedIDs).to.deep.equal(formattedActualUUIDs);
  },

  actionsIsAbsent() {
    return cy.expect(Button('Actions').absent());
  },
};
