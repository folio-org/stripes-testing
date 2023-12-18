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
  Select,
  TextArea,
  Selection,
  Option,
  OptionGroup,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import BulkEditSearchPane from './bulk-edit-search-pane';

const actionsBtn = Button('Actions');
const dropdownMenu = DropdownMenu();
const cancelBtn = Button({ id: 'clickable-cancel' });
const cancelButton = Button('Cancel');
const createBtn = Button({ id: 'clickable-create-widget' });
const plusBtn = Button({ icon: 'plus-sign' });
const deleteBtn = Button({ icon: 'trash' });
const keepEditingBtn = Button('Keep editing');
const areYouSureForm = Modal('Are you sure?');
const downloadPreviewBtn = Button('Download preview');
const newBulkEditButton = Button('New bulk edit');
const startBulkEditLocalButton = Button('Start bulk edit (Local)');
const startBulkEditButton = Button('Start bulk edit');
const calendarButton = Button({ icon: 'calendar' });
const locationLookupModal = Modal('Select permanent location');
const confirmChangesButton = Button('Confirm changes');
const downloadChnagedRecordsButton = Button('Download changed records (CSV)');
const bulkEditFirstRow = RepeatableFieldItem({ index: 0 });
const bulkEditSecondRow = RepeatableFieldItem({ index: 1 });

function getEmailField() {
  // 2 the same selects without class, id or someone different attr
  return cy.get('[class^=textField]');
}

const bulkPageSelections = {
  valueType: Select({ content: including('Select option') }),
  action: Select({ content: including('Select action') }),
  itemStatus: Select({ content: including('Select item status') }),
  patronGroup: Select({ content: including('Select patron group') }),
};

export default {
  openStartBulkEditForm() {
    cy.do(startBulkEditLocalButton.click());
  },
  openInAppStartBulkEditFrom() {
    cy.do(startBulkEditButton.click());
    cy.wait(1000);
  },
  verifyOptionsLength(optionsLength, count) {
    cy.expect(optionsLength).to.eq(count);
  },
  startBulkEditAbsent() {
    cy.expect(startBulkEditButton.absent());
  },
  closeBulkEditInAppForm() {
    cy.do(cancelBtn.click());
    cy.wait(1000);
  },
  selectOption(optionName, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(optionName),
    );
  },
  selectAction(actionName, rowIndex) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).choose(actionName),
    );
  },
  isSelectActionAbsent(rowIndex = 0) {
    cy.expect(RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).absent());
  },
  verifyBulkEditForm(rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose('Email'),
    );
    this.verifyRowIcons();
  },
  verifyRowIcons() {
    cy.expect([plusBtn.exists(), Button({ icon: 'trash', disabled: true }).exists()]);
  },

  isDisabledRowIcons(isDisabled) {
    cy.expect([plusBtn.exists(), Button({ icon: 'trash', disabled: isDisabled }).exists()]);
    BulkEditSearchPane.isConfirmButtonDisabled(true);
  },
  afterAllSelectedActions() {
    cy.expect([plusBtn.absent(), Button({ icon: 'trash', disabled: false }).exists()]);
  },
  deleteRow(rowIndex = 0) {
    cy.do(RepeatableFieldItem({ index: rowIndex }).find(deleteBtn).click());
  },
  verifyAreYouSureForm(count, cellContent) {
    cy.expect([
      areYouSureForm.find(HTML(including(`${count} records will be changed`))).exists(),
      areYouSureForm.find(keepEditingBtn).exists(),
      areYouSureForm.find(downloadPreviewBtn).exists(),
      areYouSureForm.find(Button('Commit changes')).exists(),
      areYouSureForm.find(MultiColumnListCell(cellContent)).exists(),
    ]);
  },

  verifyChangesInAreYouSureForm(column, changes) {
    changes.forEach((value) => {
      cy.expect(
        areYouSureForm.find(MultiColumnListCell({ column, content: including(value) })).exists(),
      );
    });
  },

  verifyItemStatusOptions(rowIndex = 0) {
    const options = [
      'Available',
      'Withdrawn',
      'Missing',
      'In process (non-requestable)',
      'Intellectual item',
      'Long missing',
      'Restricted',
      'Unavailable',
      'Unknown',
    ];
    cy.do([RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.itemStatus).click()]);
    this.verifyPossibleActions(options);
  },

  downloadPreview() {
    cy.do(downloadPreviewBtn.click());
    // Wait for file to download
    cy.wait(3000);
  },

  clickKeepEditingBtn() {
    cy.do(areYouSureForm.find(keepEditingBtn).click());
    cy.wait(1000);
  },

  clickX() {
    cy.do(
      Modal()
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(1000);
  },

  openActions() {
    cy.do(actionsBtn.click());
  },

  downloadMatchedRecordsExists() {
    cy.expect(Button('Download matched records (CSV)').exists());
  },

  downloadMatchedRecordsAbsent() {
    cy.expect(Button('Download matched records (CSV)').absent());
  },

  downloadErrorsExists() {
    cy.expect(Button('Download errors (CSV)').exists());
  },

  startBulkEditLocalButtonExists() {
    cy.expect(startBulkEditLocalButton.exists());
  },
  verifyActionAfterChangingRecords() {
    cy.do(actionsBtn.click());
    cy.expect([downloadChnagedRecordsButton.exists(), Button('Download errors (CSV)').exists()]);
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
    cy.xpath(
      '(//div[contains(@class, "select--")]//select[contains(@class, "selectControl--")])[3]',
    ).should('be.disabled');
  },

  replaceEmail(oldEmailDomain, newEmailDomain, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose('Email'),
    );
    BulkEditSearchPane.isConfirmButtonDisabled(true);
    getEmailField().first().type(oldEmailDomain);
    BulkEditSearchPane.isConfirmButtonDisabled(true);
    getEmailField().eq(2).type(newEmailDomain);
  },

  enterOldEmail(oldEmailDomain) {
    getEmailField().first().clear().type(oldEmailDomain);
  },

  enterNewEmail(newEmailDomain) {
    getEmailField().eq(2).clear().type(newEmailDomain);
  },

  clickLocationLookup(rowIndex = 0) {
    cy.do([RepeatableFieldItem({ index: rowIndex }).find(Button('Location look-up')).click()]);
  },

  locationLookupExists() {
    cy.expect(Button('Location look-up').exists());
  },

  verifyLocationLookupModal() {
    cy.expect([
      locationLookupModal.exists(),
      Select({ label: 'Institution' }).exists(),
      Select({ label: 'Campus' }).exists(),
      Select({ label: 'Library' }).exists(),
      Selection('Location').exists(),
      locationLookupModal.find(cancelButton).has({ disabled: false }),
      Button('Save and close').has({ disabled: true }),
    ]);
  },

  locationLookupModalCancel() {
    cy.do(locationLookupModal.find(cancelButton).click());
  },
  locationLookupModalSaveAndClose() {
    cy.do(locationLookupModal.find(Button('Save and close')).click());
  },
  replaceTemporaryLocation(location = 'Annex', type = 'item', rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(`Temporary ${type} location`),
    );
    if (type === 'item') {
      cy.do(
        RepeatableFieldItem({ index: rowIndex })
          .find(bulkPageSelections.action)
          .choose('Replace with'),
      );
    }
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Replace with'),
      Button('Select control\nSelect location').click(),
      SelectionOption(including(location)).click(),
    ]);
  },
  selectLocation(location, rowIndex) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Replace with'),
      Button('Select control\nSelect location').click(),
      SelectionOption(including(location)).click(),
    ]);
    BulkEditSearchPane.isConfirmButtonDisabled(false);
  },
  replacePermanentLocation(location, type = 'item', rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(`Permanent ${type} location`),
    );
    if (type === 'item') {
      cy.do(
        RepeatableFieldItem({ index: rowIndex })
          .find(bulkPageSelections.action)
          .choose('Replace with'),
      );
    }
    cy.do([
      Button('Select control\nSelect location').click(),
      SelectionOption(including(location)).click(),
    ]);
  },
  clickSelectedLocation(currentLocation, newLocation) {
    cy.do([
      Button(including(`Select control\n${currentLocation}`)).click(),
      cy.wait(500),
      SelectionOption(including(newLocation)).click(),
    ]);
  },
  clearPermanentLocation(type = 'item', rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(`Permanent ${type} location`),
    );
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Clear field'),
    );
  },

  clearTemporaryLocation(type = 'item', rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(`Temporary ${type} location`),
    );
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Clear field'),
    );
  },

  replaceItemStatus(status, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Item status'),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.itemStatus).choose(status),
    ]);
  },

  typeInTemporaryLocationFilter(location = 'Annex', type = 'item', rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(`Temporary ${type} location`),
    );
    if (type === 'item') {
      cy.do(
        RepeatableFieldItem({ index: rowIndex })
          .find(bulkPageSelections.action)
          .choose('Replace with'),
      );
    }
    cy.do(Button('Select control\nSelect location').click());
    cy.get('[class^=selectionFilter-]').type(location);
  },

  addNewBulkEditFilterString() {
    cy.do(plusBtn.click());
    cy.wait(1000);
  },

  verifyNewBulkEditRow() {
    cy.expect([
      bulkEditFirstRow.find(plusBtn).absent(),
      bulkEditFirstRow.find(deleteBtn).has({ disabled: false }),
      bulkEditSecondRow.find(plusBtn).exists(),
      bulkEditSecondRow.find(deleteBtn).exists(),
      confirmChangesButton.has({ disabled: true }),
    ]);
  },

  fillPatronGroup(group = 'staff (Staff Member)', rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Patron group'),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.patronGroup).choose(group),
    ]);
  },

  fillExpirationDate(date, rowIndex = 0) {
    // js date object
    const formattedDate = DateTools.getFormattedDate({ date }, 'MM/DD/YYYY');
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Expiration date'),
      calendarButton.click(),
      TextField().fillIn(formattedDate),
    ]);
    // we don't have interactor for this element
    cy.get(`[aria-label="calendar"] [data-date="${formattedDate}"]`).click();
  },

  verifyPickedDate(date, rowIndex = 0) {
    const formattedDate = DateTools.getFormattedDate({ date }, 'MM/DD/YYYY');
    // there is no aria-expanded attr when collapsed
    cy.expect([
      calendarButton.has({ ariaExpanded: null }),
      RepeatableFieldItem({ index: rowIndex })
        .find(TextField({ value: formattedDate }))
        .exists(),
    ]);
  },

  clearPickedDate(rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Button({ ariaLabel: 'Clear field value' }))
        .click(),
    );
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(TextField({ value: '' }))
        .exists(),
    );
  },

  verifyCalendarItem(rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Expiration date'),
      calendarButton.click(),
    ]);
    // TODO: bulk edit calendar is not common datepicker like our interactor
    cy.get('[id^="datepicker-calendar-container"]').should('be.visible');
  },

  fillPermanentLoanType(type = 'Selected', rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Permanent loan type'),
      RepeatableFieldItem({ index: rowIndex })
        .find(Button({ id: 'loanType' }))
        .click(),
      SelectionOption(including(type)).click(),
    ]);
  },

  fillTemporaryLoanType(type = 'Selected', rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Temporary loan type'),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Replace with'),
      RepeatableFieldItem({ index: rowIndex })
        .find(Button({ id: 'loanType' }))
        .click(),
      SelectionOption(including(type)).click(),
    ]);
  },

  clearTemporaryLoanType(rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Temporary loan type'),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Clear field'),
    ]);
  },

  editSuppressFromDiscovery(value, rowIndex = 0, holdings = false) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Suppress from discovery'),
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ content: including('Set') }))
        .choose(`Set ${value}`),
    ]);
    if (holdings) cy.expect(Checkbox('Apply to items records').has({ checked: value }));
  },

  verifyItemAdminstrativeNoteActions(rowIndex = 0) {
    const options = ['Add note', 'Remove all', 'Find', 'Change note type'];
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Administrative note'),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).click(),
    ]);
    this.verifyPossibleActions(options);
  },

  verifyTheOptionsAfterSelectedOption(content, rowIndex) {
    const options = [
      'Check in note',
      'Check out note',
      'Action note',
      'Binding',
      'Copy note',
      'Electronic bookplate',
      'Note',
      'Provenance',
      'Reproduction',
      'Item status',
      'Permanent loan type',
      'Temporary loan type',
      'Permanent item location',
      'Temporary item location',
      'Suppress from discovery',
    ];
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(content),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).click(),
    ]);
    this.verifyPossibleActions(options);
  },

  verifyTheOptionsAfterSelectedAllOptions(content, rowIndex) {
    const options = ['Suppress from discovery'];
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(content),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).click(),
    ]);
    this.verifyPossibleActions(options);
  },
  noteReplaceWith(noteType, oldNote, newNote, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(noteType),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).choose('Find'),
      RepeatableFieldItem({ index: rowIndex }).find(TextArea()).fillIn(oldNote),
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ value: '' }))
        .choose('Replace with'),
    ]);
    // TODO: redesign with interactors
    cy.xpath(`//*[@data-testid="row-${rowIndex}"]/div[5]//textarea`).type(newNote);
  },

  noteRemove(noteType, note, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(noteType),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).choose('Find'),
      RepeatableFieldItem({ index: rowIndex }).find(TextArea()).fillIn(note),
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ value: '' }))
        .choose('Remove'),
    ]);
  },

  noteRemoveAll(noteType, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(noteType),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).choose('Remove all'),
    ]);
  },

  addItemNote(type, value, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(type),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).choose('Add note'),
      RepeatableFieldItem({ index: rowIndex }).find(TextArea()).fillIn(value),
    ]);
  },

  verifyItemCheckInNoteActions(rowIndex = 0) {
    const options = [
      'Mark as staff only',
      'Remove mark as staff only',
      'Add note',
      'Remove all',
      'Find',
      'Change note type',
      'Duplicate to',
    ];
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Check in note'),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).click(),
    ]);
    this.verifyPossibleActions(options);
  },

  verifyItemNoteActions(type = 'Note', rowIndex = 0) {
    const options = [
      'Mark as staff only',
      'Remove mark as staff only',
      'Add note',
      'Remove all',
      'Find',
      'Change note type',
    ];
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(type),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.action).click(),
    ]);
    this.verifyPossibleActions(options);
  },

  markAsStaffOnly(type, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(type),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Mark as staff only'),
    ]);
  },

  removeMarkAsStaffOnly(type, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(type),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Remove mark as staff only'),
    ]);
  },

  changeNoteType(type, newType, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(type),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Change note type'),
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ value: '' }))
        .choose(newType),
    ]);
  },

  checkApplyToItemsRecordsCheckbox() {
    cy.do(Checkbox('Apply to items records').click());
  },

  verifyNoMatchingOptionsForLocationFilter() {
    cy.expect(HTML('No matching options').exists());
  },

  duplicateCheckInNote(note = 'in', rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(`Check ${note} note`),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Duplicate to'),
    ]);
    if (note === 'in') {
      cy.expect(
        RepeatableFieldItem({ index: rowIndex })
          .find(Select({ content: 'Check out note' }))
          .has({ disabled: true }),
      );
    } else {
      cy.expect(
        RepeatableFieldItem({ index: rowIndex })
          .find(Select({ content: 'Check in note' }))
          .has({ disabled: true }),
      );
    }
  },

  verifyMatchingOptionsForLocationFilter(location) {
    cy.expect(HTML(including(location)).exists());
  },

  confirmChanges() {
    cy.do(confirmChangesButton.click());
    cy.expect(Modal().find(MultiColumnListCell()).exists());
  },

  saveAndClose() {
    cy.do(Button('Save & close').click());
  },

  downloadMatchedResults() {
    cy.do(actionsBtn.click());
    cy.get('[class^="ActionMenuGroup-"] button', { timeout: 15000 }).first().click();
    BulkEditSearchPane.waitingFileDownload();
  },

  downloadErrors() {
    cy.do(Button('Download errors (CSV)').click());
    BulkEditSearchPane.waitingFileDownload();
  },

  prepareBulkEditFileWithDuplicates(fileMask, finalFileName, stringToBeReplaced, replaceString) {
    FileManager.findDownloadedFilesByMask(`*${fileMask}*`).then((downloadedFilenames) => {
      const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];

      FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
        const content = actualContent.split('\n');
        content[2] = content[1].slice().replace(stringToBeReplaced, replaceString);
        FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
      });
    });
  },

  prepareValidBulkEditFile(fileMask, finalFileName, stringToBeReplaced, replaceString) {
    FileManager.findDownloadedFilesByMask(`*${fileMask}*`).then((downloadedFilenames) => {
      const lastDownloadedFilename = downloadedFilenames.sort()[downloadedFilenames.length - 1];
      FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
        const content = actualContent.split('\n');
        content[1] = content[1].slice().replace(stringToBeReplaced, replaceString);
        FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
      });
    });
  },

  commitChanges() {
    cy.do([Modal().find(Button('Commit changes')).click()]);
  },

  clickNext() {
    cy.do([Modal().find(Button('Next')).click()]);
  },

  verifyNoNewBulkEditButton() {
    cy.expect(newBulkEditButton.absent());
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
      DropdownMenu().find(Checkbox('Tags')).has({ disabled: true }),
      DropdownMenu().find(Checkbox('Custom fields')).has({ disabled: true }),
    ]);
  },

  verifyItemActionDropdownItems(isDisabled = false) {
    cy.expect([
      dropdownMenu
        .find(Checkbox({ name: 'Barcode', checked: true, disabled: isDisabled }))
        .exists(),
      dropdownMenu.find(Checkbox({ name: 'Status', checked: true, disabled: isDisabled })).exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Item effective location', checked: true, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Call number', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Item HRID', checked: true, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Material type', checked: true, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Permanent loan type', checked: true, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Temporary loan type', checked: true, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Item ID', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Former identifiers', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Accession number', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Item permanent location', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Item temporary location', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Copy number', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Enumeration', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Chronology', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Volume', checked: false, disabled: isDisabled }))
        .exists(),
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
    cy.expect(DropdownMenu().find(downloadChnagedRecordsButton).exists());
  },

  verifyDownloadChangedRecordsAbsent() {
    cy.expect(DropdownMenu().find(downloadChnagedRecordsButton).absent());
  },

  downloadChangedCSV() {
    cy.do(downloadChnagedRecordsButton.click());
    BulkEditSearchPane.waitingFileDownload();
  },

  verifyPossibleActions(actions) {
    actions.forEach((action) => {
      cy.expect(HTML(action).exists());
    });
  },

  verifyItemOptions(rowIndex = 0) {
    const options = [
      'Administrative note',
      'Check in note',
      'Check out note',
      'Action note',
      'Binding',
      'Copy note',
      'Electronic bookplate',
      'Note',
      'Provenance',
      'Reproduction',
      'Item status',
      'Permanent loan type',
      'Temporary loan type',
      'Permanent item location',
      'Temporary item location',
      'Suppress from discovery',
    ];

    cy.do(RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).click());
    this.verifyPossibleActions(options);
  },

  verifyHoldingsOptions() {
    cy.expect([
      Option({ value: 'ADMINISTRATIVE_NOTE' }).exists(),
      OptionGroup('Electronic access')
        .find(Option({ value: 'ELECTRONIC_ACCESS_URI' }))
        .exists(),
      OptionGroup('Electronic access')
        .find(Option({ value: 'ELECTRONIC_ACCESS_URL_RELATIONSHIP' }))
        .exists(),
      OptionGroup('Electronic access')
        .find(Option({ value: 'ELECTRONIC_ACCESS_LINK_TEXT' }))
        .exists(),
      OptionGroup('Electronic access')
        .find(Option({ value: 'ELECTRONIC_ACCESS_MATERIALS_SPECIFIED' }))
        .exists(),
      OptionGroup('Electronic access')
        .find(Option({ value: 'ELECTRONIC_ACCESS_URL_PUBLIC_NOTE' }))
        .exists(),
      OptionGroup('Holdings location')
        .find(Option({ value: 'PERMANENT_HOLDINGS_LOCATION' }))
        .exists(),
      OptionGroup('Holdings location')
        .find(Option({ value: 'TEMPORARY_HOLDINGS_LOCATION' }))
        .exists(),
      OptionGroup('Holdings notes')
        .find(Option({ text: 'Action note' }))
        .exists(),
      OptionGroup('Holdings notes')
        .find(Option({ text: 'Binding' }))
        .exists(),
      OptionGroup('Holdings notes')
        .find(Option({ text: 'Copy note' }))
        .exists(),
      OptionGroup('Holdings notes')
        .find(Option({ text: 'Electronic bookplate' }))
        .exists(),
      OptionGroup('Holdings notes')
        .find(Option({ text: 'Note' }))
        .exists(),
      OptionGroup('Holdings notes')
        .find(Option({ text: 'Provenance' }))
        .exists(),
      OptionGroup('Holdings notes')
        .find(Option({ text: 'Reproduction' }))
        .exists(),
      Option({ value: 'SUPPRESS_FROM_DISCOVERY' }).exists(),
    ]);
  },
};
