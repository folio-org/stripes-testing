import { HTML, including } from '@interactors/html';
import FileManager from '../../utils/fileManager';
import {Modal, SelectionOption, Button, DropdownMenu, Checkbox, MultiColumnListHeader} from '../../../../interactors';

const actionsBtn = Button('Actions');
const dropdownMenu = DropdownMenu();
// interactor doesn't allow to pick second the same select
function getLocationSelect() {
  return cy.get('select').eq(2);
}

function getLocationTypeSelect() {
  return cy.get('select').eq(1);
}

function getEmailSelect() {
  return cy.get('select').eq(1);
}

function getPatronBlockSelect() {
  return cy.get('select').eq(1);
}

function getPatronGroupTypeSelect() {
  return cy.get('select').eq(3);
}

function getPermanentLoanSelect() {
  return cy.get('select').eq(1);
}


export default {
  openStartBulkEditForm() {
    cy.do(Button(including('Start bulk edit')).click());
  },
  verifyBulkEditForm() {
    getEmailSelect().select('Email');
    cy.expect([
      Button({ icon: 'plus-sign'}).exists(),
      Button({ icon: 'trash', disabled: true }).exists(),
    ])
  },

  openActions() {
    cy.do(actionsBtn.click());
  },

  verifyActionAfterChangingRecords() {
    cy.do(actionsBtn.click());
    cy.expect([
      Button('Download changed records (CSV)').exists(),
      Button('Download errors (CSV)').exists(),
    ]);
  },

  verifySuccessBanner(validRecordsCount) {
    cy.expect(HTML(`${validRecordsCount} records have been successfully changed`).exists());
  },

  verifyLabel(text) {
    cy.expect(Modal().find(HTML(text)).exists());
  },

  cancel() {
    cy.do(Button('Cancel').click());
  },

  replaceTemporaryLocation(location = 'Annex') {
    getLocationTypeSelect().select('Temporary item location');
    getLocationSelect().select('Replace with');
    cy.do([
      Button('Select control\nSelect location').click(),
      SelectionOption(including(location)).click(),
    ]);
  },

  fillTemporaryLocationFilter(location = 'Annex') {
    getLocationTypeSelect().select('Temporary item location');
    getLocationSelect().select('Replace with');
    cy.do(Button('Select control\nSelect location').click());
    cy.get('[class^=selectionFilter-]').type(location);
  },

  fillPatronGroup(group = 'staff (Staff Member)') {
    getPatronBlockSelect().select('Patron group');
    getPatronGroupTypeSelect().select(group);
  },

  fillLoanType(type = 'Selected') {
    getPermanentLoanSelect().select('Permanent loan type');
    cy.do([
      Button({ id: 'loanType' }).click(),
      SelectionOption(including(type)).click(),
    ]);
  },

  verifyNoMatchingOptionsForLocationFilter() {
    cy.expect(HTML('No matching options').exists());
  },

  verifyMatchingOptionsForLocationFilter(location) {
    cy.expect(HTML(including(location)).exists());
  },

  confirmChanges() {
    cy.do(Button('Confirm changes').click());
  },

  saveAndClose() {
    cy.do(Button('Save & close').click());
  },

  downloadMatchedResults(fileName = 'matchedRecords.csv') {
    cy.do(actionsBtn.click());
    // It is necessary to avoid cypress reload page expecting
    cy.get('a[download]', { timeout: 15000 }).first().then(($input) => {
      cy.downloadFile($input.attr('href'), 'cypress/downloads', fileName);
    });
  },

  prepareBulkEditFileWithDuplicates(fileMask, finalFileName, stringToBeReplaced, replaceString) {
    FileManager.findDownloadedFilesByMask(`*${fileMask}*`).then((downloadedFilenames) => {
      const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];

      FileManager.readFile(lastDownloadedFilename)
        .then((actualContent) => {
          const content = actualContent.split('\n');
          content[2] = content[1].slice().replace(stringToBeReplaced, replaceString);
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
    });
  },

  prepareValidBulkEditFile(fileMask, finalFileName, stringToBeReplaced, replaceString) {
    FileManager.findDownloadedFilesByMask(`*${fileMask}*`).then((downloadedFilenames) => {
      const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];

      FileManager.readFile(lastDownloadedFilename)
        .then((actualContent) => {
          const content = actualContent.split('\n');
          content[1] = content[1].slice().replace(stringToBeReplaced, replaceString);
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
    });
  },

  commitChanges() {
    cy.do([
      Modal().find(Button('Commit changes')).click()
    ]);
  },

  clickNext() {
    cy.do([
      Modal().find(Button('Next')).click(),
    ]);
  },

  newBulkEdit() {
    cy.do(Button('New bulk edit').click());
    // very fast reload bulk edit page
    cy.wait(500);
  },

  verifyUsersActionDropdownItems(isDisabled = false) {
    cy.expect([
      dropdownMenu.find(Checkbox({ name: 'active', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'lastName', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'firstName', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'barcode', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'patronGroup', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'username', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'email', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'expirationDate', checked: false, disabled: isDisabled })).exists(),
    ]);
  },

  verifyItemActionDropdownItems(isDisabled = false) {
    cy.expect([
      dropdownMenu.find(Checkbox({ name: 'barcode', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'status', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'effectiveLocation', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'callNumber', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'hrid', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'materialType', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'permanentLoanType', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'temporaryLoanType', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'id', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'formerIds', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'accessionNumber', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'permanentLocation', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'temporaryLocation', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'copyNumber', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'enumeration', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'chronology', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'volume', checked: false, disabled: isDisabled })).exists(),
    ]);
  },

  verifyModifyLandingPageBeforeModifying() {
    cy.expect([
      Button({ id: 'clickable-cancel', disabled: false }).exists(),
      Button({ id: 'clickable-create-widget', disabled: true }).exists(),
      Button({ icon: 'plus-sign', disabled: false }).exists(),
      Button({ icon: 'trash', disabled: true }).exists(),
    ]);
  },

  verifyModifyLandingPageAfterModifying() {
    cy.expect([
      Button({ id: 'clickable-cancel', disabled: false }).exists(),
      Button({ id: 'clickable-create-widget', disabled: false }).exists(),
      Button({ icon: 'plus-sign', disabled: false }).exists(),
      Button({ icon: 'trash', disabled: true }).exists(),
    ]);
  },

  verifyCheckedDropdownMenuItem() {
    cy.do(dropdownMenu.find(Checkbox({ name: 'firstName'})).click());
    cy.expect(MultiColumnListHeader('First name').absent());
  },

  verifyUncheckedDropdownMenuItem() {
    cy.do(dropdownMenu.find(Checkbox({ name: 'email'})).click());
    cy.expect(MultiColumnListHeader('Email').exists());
  },

  verifyActionsDownloadChangedCSV() {
    cy.expect(DropdownMenu().find(Button('Download changed records (CSV)')).exists());
  },

  downloadChangedCSV(fileName = 'changedRecords.csv') {
    // It is necessary to avoid cypress reload page expecting
    cy.get('a[download]', { timeout: 15000 }).first().then(($input) => {
      cy.downloadFile($input.attr('href'), 'cypress/downloads', fileName);
    });
  },
};
