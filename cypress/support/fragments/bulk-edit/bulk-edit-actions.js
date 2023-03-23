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
function getEmailField() {
  return cy.get('[class^=textField]');
}
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
    cy.xpath('(//div[contains(@class, "select--")]//select[contains(@class, "selectControl--")])[3]').should('be.disabled');
  },

  replaceEmail(oldEmailDomain, newEmailDomain) {
    getBulkEditSelectType().select('Email');
    getEmailField().first().type(oldEmailDomain);
    getEmailField().eq(2).type(newEmailDomain);
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
    cy.expect(Modal().find(MultiColumnListCell()).exists());
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

  downloadErrors() {
    cy.do('Download Errors(CSV)')
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

  verifyUsersActionDropdownItemsInCaseOfError() {
    cy.expect([
      DropdownMenu().find(Checkbox('Username')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('User id')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('External System ID')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Barcode')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Active')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Type')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Patron group')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Departments')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Proxy for')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Last name')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('First name')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Middle name')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Preferred first name')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Email')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Phone')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Mobile phone')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Birth date')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Addresses')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Preferred contact type id')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Date enrolled')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Expiration date')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Record created')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Record updated')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Tags')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Custom fields')).has({ disabled: true }),
    ]);
  },

  verifyItemActionDropdownItems(isDisabled = false) {
    cy.expect([
      dropdownMenu.find(Checkbox({ name: 'Barcode', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Status', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Item effective location', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Call number', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Item HRID', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Material type', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Permanent loan type', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Temporary loan type', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Item ID', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Former identifiers', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Accession number', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Item permanent location', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Item temporary location', checked: false, disabled: isDisabled })).exists(),
      dropdownMenu.find(Checkbox({ name: 'Copy number', checked: false, disabled: isDisabled })).exists(),
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
