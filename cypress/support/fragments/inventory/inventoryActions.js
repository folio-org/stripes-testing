import {
  Button,
  Section,
  Select,
  TextField,
  Modal,
  DropdownMenu,
  or,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import InventoryInstance from './inventoryInstance';
import FileManager from '../../utils/fileManager';
import InteractorsTools from '../../utils/interactorsTools';

const importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
const reImportButtonInActions = Button({ id: 'dropdown-clickable-reimport-record' });
const importButtonInModal = Button('Import');
const OCLWorldCatIdentifierTextField = TextField({ name: 'externalIdentifier' });
const importTypeSelect = Select({ name: 'externalIdentifierType' });
const locIdInputField = TextField('Enter the Library of Congress identifier');
const singleImportSuccessCalloutText = (number, overlay) => `Record ${number} ${overlay ? 'updated' : 'created'}. Results may take a few moments to become visible in Inventory`;
const importProfileSelect = Select({ name: 'selectedJobProfileId' });
const importModal = Modal({ id: 'import-record-modal' });
const cancelImportButtonInModal = importModal.find(Button('Cancel'));
const instanceActionsButton = Section({ id: 'pane-instancedetails' }).find(Button('Actions'));

function open() {
  cy.do(Section({ id: 'pane-results' }).find(Button('Actions')).click());
}

// TODO: merge inventoryActions and InventoryInstances
export default {
  open,
  options: {
    new: Button('New'),
    saveUUIDs: Button('Save instances UUIDs'),
    saveHoldingsUUIDs: Button('Save holdings UUIDs'),
    saveCQLQuery: Button('Save instances CQL query'),
    exportMARC: Button('Export instances (MARC)'),
    showSelectedRecords: Button('Show selected records'),
    newRequest: Button('New Request'),
    newFastAddRecord: Button('New fast add record'),
    inTransitItemsReport: Button('In transit items report (CSV)'),
  },
  openNewFastAddRecordForm() {
    cy.do([
      Section({ id: 'pane-results' }).find(Button('Actions')).click(),
      Button({ id: 'new-fast-add-record' }).click(),
    ]);
    cy.wait(1000);
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
  optionsAreShown: (array, isShown = true) => {
    return array.forEach((element) => {
      if (isShown) cy.expect(element.exists());
      else cy.expect(element.absent());
    });
  },

  import(specialOCLCWorldCatidentifier = InventoryInstance.validOCLC.id) {
    open();
    cy.do(importButtonInActions.click());
    cy.getSingleImportProfilesViaAPI().then((importProfiles) => {
      if (importProfiles.filter((profile) => profile.enabled === true).length > 1) {
        cy.do(importTypeSelect.choose('OCLC WorldCat'));
      }
      cy.expect(OCLWorldCatIdentifierTextField.exists());
      this.fillImportFields(specialOCLCWorldCatidentifier);

      this.pressImportInModal(specialOCLCWorldCatidentifier);
      // TODO: see issues in cypress tests run related with this step and awaiting of holdingsRecordView
      // InteractorsTools.closeCalloutMessage();
      InventoryInstance.checkExpectedMARCSource();
    });
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
    const oclcWorldCat = {
      text: 'OCLC WorldCat',
    };
    cy.get('#import-record-modal-content').then(($modal) => {
      if ($modal.find('select[name="externalIdentifierType"]').length > 0) {
        cy.do(importTypeSelect.choose(oclcWorldCat.text));
      }
    });
    cy.do(OCLWorldCatIdentifierTextField.fillIn(specialOCLCWorldCatidentifier));
  },

  pressImportInModal(
    specialOCLCWorldCatidentifier = InventoryInstance.validOCLC.id,
    overlay = false,
    expandIdentifiers = false,
  ) {
    cy.do(importButtonInModal.click());
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage(
      singleImportSuccessCalloutText(specialOCLCWorldCatidentifier, overlay),
    );
    InteractorsTools.closeCalloutMessage();
    if (expandIdentifiers) InventoryInstance.openAccordion('Identifiers');
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
    const formattedActualUUIDs = actualUUIDs
      .replaceAll('"', '')
      .split('\n')
      .map((uuid) => uuid.trim());
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
    const formattedActualUUIDs = actualIDs
      .replaceAll('"', '')
      .split('\n')
      .map((uuid) => uuid.trim());
    expect(expectedIDs).to.deep.equal(formattedActualUUIDs);
  },

  actionsIsAbsent() {
    return cy.expect(Button('Actions').absent());
  },

  importLoc(specialLOCidentifier = InventoryInstance.validLOC) {
    open();
    cy.do(importButtonInActions.click());
    cy.expect([
      importModal.exists(),
      importProfileSelect.exists(),
      importButtonInModal.is({ disabled: or(true, false) }),
      cancelImportButtonInModal.exists(),
    ]);
    cy.getSingleImportProfilesViaAPI().then((importProfiles) => {
      if (importProfiles.filter((profile) => profile.enabled === true).length > 1) {
        cy.do(importTypeSelect.choose('Library of Congress'));
      }

      cy.expect(locIdInputField.exists());
      this.fillImportFields(specialLOCidentifier);
      cy.wait(1000);
      this.pressImportInModal(specialLOCidentifier);
      InventoryInstance.checkExpectedMARCSource();
    });
  },

  overlayLoc(specialLOCidentifier = InventoryInstance.validLOC, expandIdentifiers = false) {
    cy.do([instanceActionsButton.click(), reImportButtonInActions.click()]);
    cy.expect([
      importModal.exists(),
      importProfileSelect.exists(),
      importButtonInModal.is({ disabled: true }),
      cancelImportButtonInModal.exists(),
    ]);
    cy.getSingleImportProfilesViaAPI().then((importProfiles) => {
      if (importProfiles.filter((profile) => profile.enabled === true).length > 1) {
        cy.do(importTypeSelect.choose('Library of Congress'));
      }
      cy.expect(locIdInputField.exists());
      this.fillImportFields(specialLOCidentifier);
      cy.wait(1000);
      this.pressImportInModal(specialLOCidentifier, true, expandIdentifiers);
      cy.expect(importModal.absent());
      InventoryInstance.checkExpectedMARCSource();
    });
  },

  close() {
    cy.do(Section({ id: 'pane-results' }).find(Button('Actions')).click());
    cy.expect(DropdownMenu().absent());
  },
};
