import { HTML, including } from '@interactors/html';
import FileManager from '../../utils/fileManager';
import {
  Modal,
  SelectionOption,
  Button,
  DropdownMenu,
  Checkbox,
  MultiColumnListHeader,
  MultiColumnListCell,
  TextField,
  RepeatableFieldItem,
} from '../../../../interactors';

const actionsBtn = Button('Actions');
const dropdownMenu = DropdownMenu();
const cancelBtn = Button({ id: 'clickable-cancel' });
const createBtn = Button({ id: 'clickable-create-widget' });
const plusBtn = Button({ icon: 'plus-sign' });
const deleteBtn = Button({ icon: 'trash' });
const keepEditingBtn = Button('Keep editing');
const areYouSureForm = Modal('Are you sure?');
// interactor doesn't allow to pick second the same select
function getLocationSelect() {
  return cy.get('select').eq(2);
}

function getActionSelect() {
  return cy.get('select').eq(2);
}

function getBulkEditSelectType() {
  return cy.get('select').eq(1);
}

function getPatronGroupTypeSelect() {
  return cy.get('select').eq(3);
}


export default {
  openStartBulkEditForm() {
    cy.do(Button('Start bulk edit (CSV)').click());
  },
  openInAppStartBulkEditFrom() {
    cy.do(Button('Start bulk edit').click());
  },
  verifyBulkEditForm() {
    getBulkEditSelectType().select('Email');
    cy.expect([
      Button({ icon: 'plus-sign' }).exists(),
      Button({ icon: 'trash', disabled: true }).exists(),
    ]);
  },

  verifyAreYouSureForm(count, cellContent) {
    cy.expect([
      areYouSureForm.find(HTML(including(`${count} records will be changed`))).exists(),
      areYouSureForm.find(keepEditingBtn).exists(),
      areYouSureForm.find(Button('Download preview')).exists(),
      areYouSureForm.find(Button('Commit changes')).exists(),
      areYouSureForm.find(MultiColumnListCell(cellContent)).exists()
    ]);
  },

  clickKeepEditingBtn() {
    cy.do(areYouSureForm.find(keepEditingBtn).click());
    cy.wait(1000);
  },

  clickX() {
    cy.do(Modal().find(Button({ icon: 'times' })).click());
    cy.wait(1000);
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

  replaceWithIsDisabled() {
    cy.expect(HTML('Replace with').is({ disabled: true }));
  },

  replaceTemporaryLocation(location = 'Annex', type = 'item') {
    getBulkEditSelectType().select(`Temporary ${type} location`);
    getLocationSelect().select('Replace with');
    cy.do([
      Button('Select control\nSelect location').click(),
      SelectionOption(including(location)).click(),
    ]);
  },

  replacePermanentLocation(location, type) {
    getBulkEditSelectType().select(`Permanent ${type} location`);
    cy.do([
      Button('Select control\nSelect location').click(),
      SelectionOption(including(location)).click(),
    ]);
  },

  fillTemporaryLocationFilter(location = 'Annex') {
    getBulkEditSelectType().select('Temporary item location');
    getLocationSelect().select('Replace with');
    cy.do(Button('Select control\nSelect location').click());
    cy.get('[class^=selectionFilter-]').type(location);
  },

  addNewBulkEditFilterString() {
    cy.do(plusBtn.click());
  },

  replaceSecondPermanentLocation(location = 'Annex', type = 'item') {
    cy.get('select').eq(3).select(`Permanent ${type} location`);
    cy.do([
      RepeatableFieldItem({ index: 1 }).find(Button('Select control\nSelect location')).click(),
      SelectionOption(including(location)).click(),
    ]);
  },

  fillPatronGroup(group = 'staff (Staff Member)') {
    getBulkEditSelectType().select('Patron group');
    getPatronGroupTypeSelect().select(group);
  },

  fillExpirationDate(date) {
    // date format MM/DD/YYYY
    getBulkEditSelectType().select('Expiration date');
    cy.do([
      Button({ icon: 'calendar' }).click(),
      TextField().fillIn(date)
    ]);
  },

  verifyCalendarItem() {
    getBulkEditSelectType().select('Expiration date');
    cy.do(Button({ icon: 'calendar' }).click());
    // TODO: bulk edit calendar is not common datepicker like our interactor
    cy.get('[id^="datepicker-calendar-container"]').should('be.visible');
  },

  fillLoanType(type = 'Selected') {
    getBulkEditSelectType().select('Permanent loan type');
    cy.do([
      Button({ id: 'loanType' }).click(),
      SelectionOption(including(type)).click(),
    ]);
  },

  fillTemporaryLoanType(type = 'Selected') {
    getBulkEditSelectType().select('Temporary loan type');
    getActionSelect().select('Replace with');
    cy.do([
      Button({ id: 'loanType' }).click(),
      SelectionOption(including(type)).click(),
    ]);
  },

  clearTemporaryLoanType() {
    getBulkEditSelectType().select('Temporary loan type');
    getActionSelect().select('Clear field');
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

  downloadMatchedResults() {
    cy.do(actionsBtn.click());
    cy.get('[class^="ActionMenuGroup-"] button', { timeout: 15000 }).first().click();
    // need to wait downloading
    cy.wait(5000);
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
      dropdownMenu.find(Checkbox({ name: 'Active', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Last name', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'First name', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Barcode', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Patron group', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'User name', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Email', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Expiration date', checked: false, disabled: isDisabled })).exists(),
    ]);
  },

  verifyItemActionDropdownItems(isDisabled = false) {
    cy.expect([
      dropdownMenu.find(Checkbox({ name: 'Barcode', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Status', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Effective Location', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Call Number', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Item HRID', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Material Type', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Permanent Loan Type', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Temporary Loan Type', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Item id', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Former Ids', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Accession Number', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Permanent Location', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Temporary Location', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Copy Number', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Enumeration', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Chronology', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Volume', checked: false, disabled: isDisabled })).exists(),
    ]);
  },

  verifyModifyLandingPageBeforeModifying() {
    cy.expect([
      cancelBtn.has({ disabled: false }),
      createBtn.has({ disabled: true }),
      plusBtn.has({ disabled: false }),
      deleteBtn.has({ disabled: true }),
    ]);
  },

  verifyModifyLandingPageAfterModifying() {
    cy.expect([
      cancelBtn.has({ disabled: false }),
      createBtn.has({ disabled: false }),
      plusBtn.has({ disabled: false }),
      deleteBtn.has({ disabled: true }),
    ]);
  },

  verifyCheckedDropdownMenuItem() {
    cy.do(dropdownMenu.find(Checkbox({ name: 'First name' })).click());
    cy.expect(MultiColumnListHeader('First name').absent());
  },

  verifyUncheckedDropdownMenuItem() {
    cy.do(dropdownMenu.find(Checkbox({ name: 'Email' })).click());
    cy.expect(MultiColumnListHeader('Email').exists());
  },

  verifyActionsDownloadChangedCSV() {
    cy.expect(DropdownMenu().find(Button('Download changed records (CSV)')).exists());
  },

  downloadChangedCSV() {
    cy.do(Button('Download changed records (CSV)').click());
    // need to wait downloading
    cy.wait(5000);
  },

  verifyPossibleActions(actions) {
    actions.forEach(action => {
      cy.expect(HTML(action).exists());
    });
  }
};
