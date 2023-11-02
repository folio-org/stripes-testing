import { Button, Section, Select, TextField } from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import InventoryInstance from './inventoryInstance';
import FileManager from '../../utils/fileManager';

const importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
const reImportButtonInActions = Button({ id: 'dropdown-clickable-reimport-record' });
const importButtonInModal = Button('Import');
const OCLWorldCatIdentifierTextField = TextField({ name: 'externalIdentifier' });
const importTypeSelect = Select({ name: 'externalIdentifierType' });

function open() {
  cy.do(Section({ id: 'pane-results' }).find(Button('Actions')).click());
}

// TODO: merge inventoryActions and InventoryInstances
export default {
  open,
  options: {
    new: Button('New'),
    saveUUIDs: Button('Save instances UUIDs'),
    saveCQLQuery: Button('Save instances CQL query'),
    exportMARC: Button('Export instances (MARC)'),
    showSelectedRecords: Button('Show selected records'),
    newRequest: Button('New Request'),
    newFastAddRecord: Button('New Fast Add Record'),
  },
  openNewFastAddRecordForm() {
    cy.do([
      Section({ id: 'pane-results' }).find(Button('Actions')).click(),
      Button({ id: 'new-fast-add-record' }).click(),
    ]);
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
    open();
    cy.do(importButtonInActions.click());
    cy.expect(OCLWorldCatIdentifierTextField.exists());
    this.fillImportFields(specialOCLCWorldCatidentifier);

    this.pressImportInModal(specialOCLCWorldCatidentifier);
    // TODO: see issues in cypress tests run related with this step and awaiting of holdingsRecordView
    // InteractorsTools.closeCalloutMessage();
    InventoryInstance.checkExpectedMARCSource();
  },

  openSingleReportImportModal: () => {
    open();
    cy.do(importButtonInActions.click());
  },

  openReImportModal: () => {
    open();
    cy.do(reImportButtonInActions.click());
  },

  // the same steps can be used in Overlay Source Bibliographic Record
  fillImportFields(specialOCLCWorldCatidentifier = InventoryInstance.validOCLC.id) {
    // TODO: remove in the future, now related with differenes in our environments
    if (Cypress.env('is_kiwi_release')) {
      const oclcWorldCat = {
        text: 'OCLC WorldCat',
        value: '6f171ee7-7a0a-4dd4-8959-bd67ec07cc88',
      };

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
    const expectedFileNameMask =
      /SearchInstanceUUIDs\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const actualDate = DateTools.parseDateFromFilename(
      FileManager.getFileNameFromFilePath(actualName),
    );
    DateTools.verifyDate(actualDate);
  },

  verifySavedUUIDs(actualUUIDs, expectedUUIDs) {
    const formattedActualUUIDs = actualUUIDs.replaceAll('"', '').split('\n');
    expect(expectedUUIDs).to.deep.equal(formattedActualUUIDs);
  },

  verifySaveCQLQueryFileName(actualName) {
    // valid name example: SearchInstanceCQLQuery2021-12-09T14_45_54+03_00.cql
    const expectedFileNameMask =
      /SearchInstanceCQLQuery\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.cql/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const actualDate = DateTools.parseDateFromFilename(
      FileManager.getFileNameFromFilePath(actualName),
    );
    DateTools.verifyDate(actualDate);
  },

  verifySaveCQLQuery(actualQuery, locationId, kw = '*', lang = 'eng') {
    const expectedKeywords = `keyword all "${kw}"`;
    expect(actualQuery).to.have.string(expectedKeywords);

    const expectedISBN = `isbn="${kw}"`;
    expect(actualQuery).to.have.string(expectedISBN);

    const expectedLang = `languages=="${lang}"`;
    expect(actualQuery).to.have.string(expectedLang);

    const expectedEffectiveLocationId = `items.effectiveLocationId=="${locationId}"`;
    expect(actualQuery).to.have.string(expectedEffectiveLocationId);
  },

  verifyInstancesMARCFileName(actualName) {
    // valid name example: QuickInstanceExport2021-12-24T14_05_53+03_00.csv
    const expectedFileNameMask =
      /QuickInstanceExport\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const actualDate = DateTools.parseDateFromFilename(
      FileManager.getFileNameFromFilePath(actualName),
    );
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
