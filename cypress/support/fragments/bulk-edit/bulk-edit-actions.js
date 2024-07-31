import { HTML, including } from '@interactors/html';
import { not } from 'bigtest';
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
  Keyboard,
  MultiColumnListRow,
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
const startBulkEditInstanceButton = Button('Start bulk edit - Instance fields');
const calendarButton = Button({ icon: 'calendar' });
const locationLookupModal = Modal('Select permanent location');
const confirmChangesButton = Button('Confirm changes');
const downloadChnagedRecordsButton = Button('Download changed records (CSV)');
const bulkEditFirstRow = RepeatableFieldItem({ index: 0 });
const bulkEditSecondRow = RepeatableFieldItem({ index: 1 });
const commitChanges = Button('Commit changes');
const locationSelection = Selection({ name: 'locationId' });
const oldEmail = TextField({ testid: 'input-email-0' });
const newEmail = TextField({ testid: 'input-email-1' });

const bulkPageSelections = {
  valueType: Selection({ value: including('Select control') }),
  action: Select({ content: including('Select action') }),
  itemStatus: Select({ content: including('Select item status') }),
  patronGroup: Select({ content: including('Select patron group') }),
};

export default {
  openStartBulkEditForm() {
    cy.do(startBulkEditLocalButton.click());
  },
  openStartBulkEditInstanceForm() {
    cy.do(startBulkEditInstanceButton.click());
    cy.wait(1000);
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
  startBulkEditLocalAbsent() {
    cy.expect(startBulkEditLocalButton.absent());
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
  selectAction(actionName, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ dataTestID: 'select-actions-0' }))
        .choose(actionName),
    );
  },
  selectSecondAction(actionName, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ dataTestID: 'select-actions-1' }))
        .choose(actionName),
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

  verifyOptionsDropdown(isExist = true) {
    if (isExist) {
      cy.expect(bulkPageSelections.valueType.exists());
    } else {
      cy.expect(bulkPageSelections.valueType.absent());
    }
  },

  verifySearchSectionClosed() {
    cy.expect(locationSelection.has({ open: false }));
  },

  verifyLocationValue(value) {
    cy.expect(Selection({ singleValue: value }).visible());
  },

  isDisabledRowIcons(isDisabled) {
    cy.expect([plusBtn.exists(), Button({ icon: 'trash', disabled: isDisabled }).exists()]);
    BulkEditSearchPane.isConfirmButtonDisabled(true);
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

  verifyChangesInAreYouSureFormByRow(column, changes, row = 0) {
    changes.forEach((value) => {
      cy.expect(
        areYouSureForm
          .find(MultiColumnListRow({ indexRow: `row-${row}` }))
          .find(MultiColumnListCell({ column, content: including(value) }))
          .exists(),
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

  openActionsIfNotYet() {
    cy.get('[class*="actionMenuToggle---"]').then(($element) => {
      if ($element.attr('aria-expanded') === 'false') {
        cy.wrap($element).click();
      }
    });
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

  replaceWithIsDisabled(rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ content: 'Replace with' }))
        .has({ disabled: true }),
    ]);
  },

  enterOldEmail(oldEmailDomain) {
    cy.do([oldEmail.clear(), oldEmail.fillIn(oldEmailDomain)]);
  },

  enterNewEmail(newEmailDomain) {
    cy.do([newEmail.clear(), newEmail.fillIn(newEmailDomain)]);
  },

  replaceEmail(oldEmailDomain, newEmailDomain, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose('Email'),
    );
    BulkEditSearchPane.isConfirmButtonDisabled(true);
    cy.do(oldEmail.fillIn(oldEmailDomain));
    BulkEditSearchPane.isConfirmButtonDisabled(true);
    cy.do(newEmail.fillIn(newEmailDomain));
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
  selectLocation(location, rowIndex = 0) {
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
    cy.wait(1000);
    if (type === 'item') {
      cy.do(
        RepeatableFieldItem({ index: rowIndex })
          .find(bulkPageSelections.action)
          .choose('Replace with'),
      );
    }
    cy.wait(1000);
    cy.do(Button('Select control\nSelect location').click());
    cy.get('[class^=selectionFilter-]').eq(1).type(location);
  },

  addNewBulkEditFilterString() {
    cy.wait(1000);
    cy.do(plusBtn.click());
    cy.wait(1000);
  },

  verifyOptionAbsentInNewRow(option, rowIndex = 1) {
    cy.do(RepeatableFieldItem({ index: rowIndex }).find(HTML(option)).absent());
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
    ]);
    cy.wait(1000);
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Replace with'),
    ]);
    cy.wait(1000);
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(Button({ id: 'loanType' }))
        .click(),
      SelectionOption(type).click(),
    ]);
  },

  clearTemporaryLoanType(rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose('Temporary loan type'),
    ]);
    cy.wait(1000);
    cy.do([
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
    if (holdings) cy.expect(Checkbox('Apply to all items records').has({ checked: value }));
  },

  clickOptionsSelection(rowIndex = 0) {
    cy.wait(1000);
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).focus(),
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).open(),
    ]);
    cy.wait(1000);
  },

  verifyItemAdminstrativeNoteActions(rowIndex = 0) {
    const options = ['Add note', 'Remove all', 'Find (full field search)', 'Change note type'];
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

  fillInFirstTextArea(oldItem, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .fillIn(oldItem),
    );
  },

  fillInSecondTextArea(newItem, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(TextArea({ dataTestID: 'input-textarea-1' }))
        .fillIn(newItem),
    );
  },

  selectFromUnchangedSelect(selection, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ id: 'urlRelationship', selectClass: not(including('isChanged')) }))
        .choose(selection),
    );
  },

  findValue(type, rowIndex = 0) {
    cy.wait(2000);
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(type),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Find (full field search)'),
    ]);
  },

  noteReplaceWith(noteType, oldNote, newNote, rowIndex = 0) {
    this.findValue(noteType, rowIndex);
    this.fillInFirstTextArea(oldNote, rowIndex);
    this.selectSecondAction('Replace with', rowIndex);
    this.fillInSecondTextArea(newNote, rowIndex);
  },

  electronicAccessReplaceWith(property, oldValue, newValue, rowIndex = 0) {
    this.findValue(property, rowIndex);
    cy.wait(2000);
    this.selectFromUnchangedSelect(oldValue, rowIndex);
    this.selectSecondAction('Replace with', rowIndex);
    this.selectFromUnchangedSelect(newValue, rowIndex);
  },

  noteRemove(noteType, note, rowIndex = 0) {
    this.findValue(noteType, rowIndex);
    cy.do([
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
      'Find (full field search)',
      'Change note type',
      'Duplicate to',
    ];
    if (rowIndex === 0) {
      cy.do([RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).open()]);
    }
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
      'Find (full field search)',
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
    ]);
    cy.wait(2000);
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).choose(type),
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Remove mark as staff only'),
    ]);
    cy.wait(2000);
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
    cy.do(Checkbox('Apply to all items records').click());
  },

  applyToItemsRecordsCheckboxExists(checked) {
    cy.expect(Checkbox({ label: 'Apply to all items records', checked }).exists());
  },

  applyToHoldingsItemsRecordsCheckboxExists(checked) {
    cy.expect([
      Checkbox({ label: 'Apply to all items records', checked }).exists(),
      Checkbox({ label: 'Apply to all holdings records', checked }).exists(),
    ]);
  },

  verifyNoMatchingOptionsForLocationFilter() {
    cy.expect(HTML('-List is empty-').exists());
  },

  duplicateCheckInNote(note = 'in', rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .choose(`Check ${note} note`),
    ]);
    cy.wait(1000);
    cy.do([
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.action)
        .choose('Duplicate to'),
    ]);
    cy.wait(1000);
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
  isCommitButtonDisabled(isDisabled) {
    cy.expect(commitChanges.has({ disabled: isDisabled }));
  },

  confirmChanges() {
    cy.wait(2000);
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
    cy.wait(2000);
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
        .find(Checkbox({ name: 'Effective call number', checked: true, disabled: isDisabled }))
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
        .find(Checkbox({ name: 'Item UUID', checked: false, disabled: isDisabled }))
        .exists(),
      dropdownMenu
        .find(Checkbox({ name: 'Former identifier', checked: false, disabled: isDisabled }))
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

  verifyHoldingsOptions() {
    this.clickOptionsSelection();
    cy.expect([
      SelectionOption('Administrative note').exists(),
      SelectionOption('Link text').exists(),
      SelectionOption('Materials specified').exists(),
      SelectionOption('URI').exists(),
      SelectionOption('URL public note').exists(),
      SelectionOption('URL Relationship').exists(),
      SelectionOption('Permanent holdings location').exists(),
      SelectionOption('Temporary holdings location').exists(),
      SelectionOption('Action note').exists(),
      SelectionOption('Binding').exists(),
      SelectionOption('Copy note').exists(),
      SelectionOption('Electronic bookplate').exists(),
      SelectionOption('Note').exists(),
      SelectionOption('Provenance').exists(),
      SelectionOption('Reproduction').exists(),
      SelectionOption('Suppress from discovery').exists(),
    ]);
    this.clickOptionsSelection();
  },

  fillLocation(location) {
    cy.do([
      locationSelection.filterOptions(location),
      // need to wait until value will be applied
      cy.wait(1000),
      Keyboard.enter(),
    ]);
  },

  verifyItemOptions() {
    this.clickOptionsSelection();
    cy.expect([
      SelectionOption('Administrative note').exists(),
      SelectionOption('Check in note').exists(),
      SelectionOption('Check out note').exists(),
      SelectionOption('Check out note').exists(),
      SelectionOption('Binding').exists(),
      SelectionOption('Copy note').exists(),
      SelectionOption('Electronic bookplate').exists(),
      SelectionOption('Note').exists(),
      SelectionOption('Provenance').exists(),
      SelectionOption('Reproduction').exists(),
      SelectionOption('Item status').exists(),
      SelectionOption('Permanent loan type').exists(),
      SelectionOption('Temporary loan type').exists(),
      SelectionOption('Permanent item location').exists(),
      SelectionOption('Temporary item location').exists(),
      SelectionOption('Suppress from discovery').exists(),
    ]);
    this.clickOptionsSelection();
  },

  selectType(type, rowIndex = 1, whichSelect = 0) {
    cy.get(`[class^="repeatableField"]:eq(${rowIndex}) #urlRelationship`)
      .eq(whichSelect)
      .select(type);
  },

  checkTypeNotExist(type, rowIndex = 1, whichSelect = 0) {
    cy.get(`[class^="repeatableField"]:eq(${rowIndex}) #urlRelationship`)
      .eq(whichSelect)
      .then(($select) => {
        expect($select.text()).to.not.contain(type);
      });
  },

  verifyCheckboxAbsent() {
    cy.expect(Checkbox().absent());
  },

  verifyCheckboxAbsentByRow(rowIndex = 0) {
    cy.expect(RepeatableFieldItem({ index: rowIndex }).find(Checkbox()).absent());
  },

  verifyStaffOnlyCheckbox(checked = false, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Checkbox({ label: 'Staff only', checked }))
        .exists(),
    );
  },

  checkStaffOnlyCheckbox(rowIndex = 0) {
    this.verifyStaffOnlyCheckbox(false, rowIndex);
    cy.do(RepeatableFieldItem({ index: rowIndex }).find(Checkbox('Staff only')).click());
  },

  uncheckStaffOnlyCheckbox(rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Checkbox({ label: 'Staff only', checked: true }))
        .click(),
    );
  },

  verifyActionButtonDisabled(isDisabled = true) {
    cy.expect(actionsBtn.has({ disabled: isDisabled }));
  },
};
