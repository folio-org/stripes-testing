import { HTML, including, not } from '@interactors/html';
import FileManager from '../../utils/fileManager';
import {
  Accordion,
  Modal,
  SelectionOption,
  SelectionList,
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
  MessageBanner,
  Option,
  or,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import BulkEditSearchPane from './bulk-edit-search-pane';

const actionsBtn = Button('Actions');
const bulkEditsAccordion = Accordion('Bulk edits');
const dropdownMenu = DropdownMenu();
const cancelBtn = Button({ id: 'clickable-cancel' });
const cancelButton = Button('Cancel');
const createBtn = Button({ id: 'clickable-create-widget' });
const plusBtn = Button({ icon: 'plus-sign' });
const deleteBtn = Button({ icon: 'trash' });
const keepEditingBtn = Button('Keep editing');
const areYouSureForm = Modal('Are you sure?');
const downloadPreviewInCSVFormatBtn = Button('Download preview in CSV format');
const newBulkEditButton = Button('New bulk edit');
const startBulkEditLocalButton = Button('Start bulk edit (Local)');
const startBulkEditButton = Button('Start bulk edit');
const startBulkEditInstanceButton = Button('FOLIO Instances');
const calendarButton = Button({ icon: 'calendar' });
const locationLookupModal = Modal('Select permanent location');
const confirmChangesButton = Button('Confirm changes');
const downloadChnagedRecordsButton = Button('Download changed records (CSV)');
const commitChanges = Button('Commit changes');
const locationSelection = Selection({ name: 'locationId' });
const oldEmail = TextField({ testid: 'input-email-0' });
const newEmail = TextField({ testid: 'input-email-1' });
const closeAreYouSureModalButton = areYouSureForm.find(Button({ icon: 'times' }));
const selectNoteHoldingTypeDropdown = Select({ id: 'noteHoldingsType' });
const saveAndCloseButton = Button('Save & close');
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
    cy.wait(2000);
  },
  openInAppStartBulkEditFrom() {
    cy.do(startBulkEditButton.click());
    cy.wait(2000);
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
  startBulkEditInstanceAbsent() {
    cy.expect(startBulkEditInstanceButton.absent());
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
    cy.wait(1000);
  },

  verifyOptionSelected(optionName, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(bulkPageSelections.valueType)
        .has({ singleValue: optionName }),
    );
    cy.wait(1000);
  },

  selectAction(actionName, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ dataTestID: 'select-actions-0' }))
        .choose(actionName),
    );
  },

  verifyActionSelected(option, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ dataTestID: 'select-actions-0' }))
        .has({ checkedOptionText: option }),
    );
  },

  selectSecondAction(actionName, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ dataTestID: 'select-actions-1' }))
        .choose(actionName),
    );
    cy.wait(500);
  },

  verifySecondActionSelected(option, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ dataTestID: 'select-actions-1' }))
        .has({ checkedOptionText: option }),
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

  deleteRowBySelectedOption(option) {
    cy.do(RepeatableFieldItem({ singleValue: option }).find(deleteBtn).click());
  },

  verifyAreYouSureForm(count, cellContent) {
    cy.expect([
      areYouSureForm.find(HTML(including(`${count} records will be changed`))).exists(),
      areYouSureForm.find(keepEditingBtn).exists(),
      areYouSureForm.find(downloadPreviewInCSVFormatBtn).exists(),
      areYouSureForm.find(commitChanges).exists(),
    ]);
    if (cellContent) {
      cy.expect(areYouSureForm.find(MultiColumnListCell(cellContent)).exists());
    }
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

  verifyChangesInAreYouSureFormByRowExactMatch(column, changes, row = 0) {
    changes.forEach((value) => {
      cy.expect(
        areYouSureForm
          .find(MultiColumnListRow({ indexRow: `row-${row}` }))
          .find(MultiColumnListCell({ column, content: value }))
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
      'In process',
    ];
    cy.do([RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.itemStatus).click()]);
    this.verifyPossibleActions(options);
  },

  downloadPreview() {
    cy.do(downloadPreviewInCSVFormatBtn.click());
    // Wait for file to download
    cy.wait(3000);
  },

  verifyDownloadPreviewButtonDisabled(isDisabled = true) {
    cy.expect(areYouSureForm.find(downloadPreviewInCSVFormatBtn).has({ disabled: isDisabled }));
  },

  clickKeepEditingBtn() {
    cy.do(areYouSureForm.find(keepEditingBtn).click());
    cy.wait(1000);
  },

  verifyKeepEditingButtonDisabled(isDisabled = true) {
    cy.expect(areYouSureForm.find(keepEditingBtn).has({ disabled: isDisabled }));
  },

  clickX() {
    cy.do(
      Modal()
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(1000);
  },

  verifyCloseAreYouSureModalButtonDisabled(isDisabled = true) {
    cy.expect(closeAreYouSureModalButton.has({ disabled: isDisabled }));
  },

  closeAreYouSureForm() {
    cy.do(closeAreYouSureModalButton.click());
  },

  openActions() {
    cy.do(actionsBtn.click());
  },

  verifyActionsButtonDisabled(isDisabled = true) {
    cy.expect(actionsBtn.has({ disabled: isDisabled }));
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

  verifySuccessBanner(validRecordsCount = 1) {
    cy.expect(
      MessageBanner().has({
        textContent: `${validRecordsCount} records have been successfully changed`,
      }),
    );
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
      saveAndCloseButton.has({ disabled: true }),
    ]);
  },

  locationLookupModalCancel() {
    cy.do(locationLookupModal.find(cancelButton).click());
  },

  locationLookupModalSaveAndClose() {
    cy.do(locationLookupModal.find(saveAndCloseButton).click());
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

  verifyRowWithOptionAbsent(option) {
    cy.expect(RepeatableFieldItem({ singleValue: option }).absent());
  },

  verifyRowWithOptionExists(option) {
    cy.expect(RepeatableFieldItem({ singleValue: option }).exists());
  },

  verifyNewBulkEditRow(rowIndex = 1) {
    cy.expect([
      RepeatableFieldItem({ index: rowIndex - 1 })
        .find(plusBtn)
        .absent(),
      RepeatableFieldItem({ index: rowIndex - 1 })
        .find(deleteBtn)
        .has({ disabled: false }),
      RepeatableFieldItem({ index: rowIndex }).find(plusBtn).exists(),
      RepeatableFieldItem({ index: rowIndex }).find(deleteBtn).exists(),
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
    cy.do([RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).open()]);
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

  verifyTheOptionsForChangingNoteType(expectedOptions, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(selectNoteHoldingTypeDropdown)
        .allOptionsText()
        .then((actualOptions) => {
          const actualEnabledOptions = actualOptions.filter(
            (actualOption) => !actualOption.includes('disabled'),
          );
          expect(actualEnabledOptions).to.deep.equal(expectedOptions);
        }),
    );
  },

  verifyTheActionOptions(expectedOptions, rowIndex = 0) {
    cy.then(() => {
      cy.do(
        RepeatableFieldItem({ index: rowIndex })
          .find(Select('Actions select'))
          .allOptionsText()
          .then((actualOptions) => {
            const actualEnabledOptions = actualOptions.filter(
              (actualOption) => !actualOption.includes('disabled'),
            );
            expect(actualEnabledOptions).to.deep.equal(expectedOptions);
          }),
      );
    });
  },

  verifyTheSecondActionOptions(expectedOptions, rowIndex = 0) {
    cy.then(() => {
      cy.do(
        RepeatableFieldItem({ index: rowIndex })
          .find(Select({ dataTestID: 'select-actions-1' }))
          .allOptionsText()
          .then((actualOptions) => {
            const actualEnabledOptions = actualOptions.filter(
              (actualOption) => !actualOption.includes('disabled'),
            );
            expect(actualEnabledOptions).to.deep.equal(expectedOptions);
          }),
      );
    });
  },

  fillInFirstTextArea(oldItem, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .fillIn(oldItem),
    );
  },

  verifyValueInFirstTextArea(value, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .has({ value }),
    );
  },

  fillInSecondTextArea(newItem, rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(TextArea({ dataTestID: 'input-textarea-1' }))
        .fillIn(newItem),
    );
  },

  verifyValueInSecondTextArea(value, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(TextArea({ dataTestID: 'input-textarea-1' }))
        .has({ value }),
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

  replaceWithAction(option, newValue, rowIndex = 0) {
    this.selectOption(option, rowIndex);
    this.selectSecondAction('Replace with', rowIndex);
    this.verifySecondActionSelected('Replace with', rowIndex);
    this.fillInSecondTextArea(newValue, rowIndex);
    this.verifyValueInSecondTextArea(newValue, rowIndex);
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

  addItemNoteAndVerify(type, value, rowIndex = 0) {
    this.addItemNote(type, value, rowIndex);
    this.verifyOptionSelected(type, rowIndex);
    this.verifySecondActionSelected('Add note', rowIndex);
    this.verifyValueInSecondTextArea(value, rowIndex);
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
      cy.do([RepeatableFieldItem({ index: rowIndex }).find(bulkPageSelections.valueType).click()]);
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
    this.verifyOptionSelected(type, rowIndex);
    this.verifySecondActionSelected('Change note type', rowIndex);
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ id: or('noteHoldingsType', 'noteType', 'noteInstanceType') }))
        .has({ checkedOptionText: newType }),
    );
  },

  selectNoteTypeWhenChangingIt(newType, rowIndex = 0) {
    cy.do([
      RepeatableFieldItem({ index: rowIndex }).find(selectNoteHoldingTypeDropdown).choose(newType),
    ]);
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(selectNoteHoldingTypeDropdown)
        .has({ checkedOptionText: newType }),
    );
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
    cy.do(saveAndCloseButton.click());
  },

  downloadMatchedResults() {
    cy.do(actionsBtn.click());
    cy.wait(500);
    cy.do(Button('Download matched records (CSV)').click());
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
    cy.do([Modal().find(commitChanges).click()]);
    cy.wait(2000);
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

  verifyOptionExistsInSelectOptionDropdown(option) {
    cy.then(() => {
      SelectionList({ placeholder: 'Filter options list' })
        .optionList()
        .then((list) => {
          expect(list).to.include(option);
        });
    });
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

  checkTypeExists(type, rowIndex = 0, whichSelect = 0) {
    cy.get(`[class^="repeatableField"]:eq(${rowIndex}) #urlRelationship`)
      .eq(whichSelect)
      .then(($select) => {
        expect($select.text()).to.contain(type);
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

  verifyCancelButtonDisabled(isDisabled = true) {
    cy.expect(cancelButton.has({ disabled: isDisabled }));
  },

  verifyMessageBannerInAreYouSureForm(numberOfRecords) {
    cy.expect(
      areYouSureForm.find(MessageBanner()).has({
        textContent: `${numberOfRecords} records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.`,
      }),
    );
  },

  verifyActionsColumnIsNotPopulated() {
    cy.expect(bulkEditsAccordion.find(Select({ dataTestID: 'select-actions-1' })).absent());
  },

  verifyActionsSelectDropdownDisabled(rowIndex = 0, isDisabled = true) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select('Actions select'))
        .has({ disabled: isDisabled }),
    );
  },

  verifySelectOptionsHoldingSortedAlphabetically() {
    this.clickOptionsSelection();

    const group = 'li[class*="groupLabel"]';
    const option = '[class*="optionSegment"]';

    // check that the group names are sorted alphabetically
    cy.get('[class*="selectionList"] li:not([class*="groupedOption"])').then((groups) => {
      const groupTexts = groups.get().map((el) => el.innerText);
      const sortedGroupTexts = [...groupTexts].sort((a, b) => a.localeCompare(b));

      expect(sortedGroupTexts).to.deep.equal(groupTexts);
    });

    // check that the option names in the group are sorted alphabetically
    cy.get(group).each(($groupLabel) => {
      const optionTexts = [];

      cy.wrap($groupLabel)
        .nextUntil(group)
        .each(($option) => {
          cy.wrap($option)
            .find(option)
            .invoke('text')
            .then((text) => {
              optionTexts.push(text);
            });
        })
        .then(() => {
          const sortedOptionTexts = [...optionTexts].sort((a, b) => a.localeCompare(b));

          expect(sortedOptionTexts).to.deep.equal(optionTexts);
        });
    });
  },

  verifySelectOptionsInstanceSortedAlphabetically() {
    this.clickOptionsSelection();

    const group = 'li[class*="groupLabel"]';
    const option = '[class*="optionSegment"]';

    // check that the group names are sorted alphabetically
    cy.get('[class*="selectionList"] li:not([class*="groupedOption"])').then((groups) => {
      const groupTexts = groups.get().map((el) => el.innerText);
      const sortedGroupTexts = [...groupTexts].sort((a, b) => a.localeCompare(b));

      expect(sortedGroupTexts).to.deep.equal(groupTexts);
    });

    // check that the option names in the group are sorted alphabetically
    cy.get(group).each(($groupLabel) => {
      const optionTexts = [];

      cy.wrap($groupLabel)
        .nextUntil('[class*="selectionList"] li:not([class*="groupedOption"])')
        .each(($option) => {
          cy.wrap($option)
            .find(option)
            .invoke('text')
            .then((text) => {
              optionTexts.push(text);
            });
        })
        .then(() => {
          const sortedOptionTexts = [...optionTexts].sort((a, b) => a.localeCompare(b));

          expect(sortedOptionTexts).to.deep.equal(optionTexts);
        });
    });
  },

  verifyNoteTypeInNoteHoldingTypeDropdown(noteType, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(selectNoteHoldingTypeDropdown)
        .has({ content: including(noteType) }),
    );
  },

  verifyAreYouSureFormAbsents() {
    cy.expect(areYouSureForm.absent());
  },

  verifyOptionsFilterInFocus() {
    const inputElement = 'input[placeholder="Filter options list"]';
    cy.get(inputElement).click();
    cy.get(inputElement).should('have.focus');
  },

  typeInFilterOptionsList(value) {
    cy.get('input[placeholder="Filter options list"]').clear().type(value);
    cy.wait(500);
  },

  verifyFilteredOptionsListIncludesOptionsWithText(value) {
    cy.get('ul[class^="selectionList-"] li:not([class*="groupLabel"])').each(($li) => {
      cy.wrap($li)
        .invoke('text')
        .then((text) => {
          expect(text.toLowerCase()).to.include(value);
        });
    });
  },

  verifyNoMatchingOptionsInFilterOptionsList() {
    cy.get('ul[class^="selectionList-"] li').should('have.text', '-List is empty-');
  },

  clearFilterOptionsListByClickingBackspace() {
    cy.get('input[placeholder="Filter options list"]')
      .invoke('val')
      .then((text) => {
        const length = text.length;
        const backspaces = '{backspace}'.repeat(length);

        cy.get('input[placeholder="Filter options list"]').type(backspaces);
        cy.wait(1000);
      });
  },

  verifyValueInInputOfFilterOptionsList(value) {
    cy.get('input[placeholder="Filter options list"]').should('have.value', value);
  },

  clickFilteredOption(option) {
    cy.do(SelectionOption(including(option)).click());
  },

  verifyNoteTypeAbsentInNoteItemTypeDropdown(noteType, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ id: 'noteType' }))
        .find(Option({ text: noteType }))
        .absent(),
    );
  },

  verifyGroupOptionsInSelectOptionsItemDropdown() {
    this.clickOptionsSelection();

    const expectedOptions = [
      ['Administrative note', 'Suppress from discovery'],
      [
        'Action note',
        'Binding',
        'Copy note',
        'Electronic bookplate',
        'Note',
        'Provenance',
        'Reproduction',
      ],
      [
        'Check in note',
        'Check out note',
        'Item status',
        'Permanent loan type',
        'Temporary loan type',
      ],
      ['Permanent item location', 'Temporary item location'],
    ];
    const expectedGroupLabels = [
      'Administrative data',
      'Item notes',
      'Loan and availability',
      'Location',
    ];
    const groupSelector = 'li[class*="groupLabel"]';

    cy.get(groupSelector).each(($groupLabel, ind) => {
      const labelName = $groupLabel.text();

      expect(labelName).to.eq(expectedGroupLabels[ind]);

      const optionTexts = [];

      cy.wrap($groupLabel)
        .nextUntil(groupSelector)
        .filter('[class*="groupedOption"]')
        .each(($option) => {
          cy.wrap($option)
            .invoke('text')
            .then((text) => {
              optionTexts.push(text);
            });
        })
        .then(() => {
          expectedOptions[ind].forEach((expectedOption) => {
            expect(optionTexts).to.include(expectedOption);
          });
        });
    });
  },
};
