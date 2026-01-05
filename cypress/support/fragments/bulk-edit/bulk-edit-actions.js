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
  MultiSelect,
  MultiSelectMenu,
  MessageBanner,
  Option,
  or,
  Pane,
  Popover,
  Icon,
  Tooltip,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import BulkEditSearchPane from './bulk-edit-search-pane';

const bulkEditPane = HTML({ className: including('LayerRoot-') });
const actionsBtn = Button('Actions');
const bulkEditsAccordion = Accordion('Bulk edits');
const bulkEditsAdministrativeDataAccordion = Accordion('Bulk edits for administrative data');
const bulkEditsMarcInstancesAccordion = Accordion('Bulk edits for instances with source MARC');
const bulkEditsAccordions = Accordion(or('Bulk edits for administrative data', 'Bulk edits'));
const changesAccordion = Accordion('Preview of records changed');
const dropdownMenu = DropdownMenu();
const cancelBtn = Button({ id: 'clickable-cancel' });
const cancelButton = Button('Cancel');
const confirmChanges = Button('Confirm changes');
const createBtn = Button({ id: 'clickable-create-widget' });
const plusBtn = Button({ icon: 'plus-sign' });
const deleteBtn = Button({ icon: 'trash' });
const keepEditingBtn = Button('Keep editing');
const areYouSureForm = Modal('Are you sure?');
const downloadMatchedRecordsButton = Button('Download matched records (CSV)');
const downloadPreviewInCSVFormatBtn = Button('Download preview in CSV format');
const downloadPreviewInMarcFormatButton = Button('Download preview in MARC format');
const downloadErrorsButton = Button('Download errors (CSV)');
const newBulkEditButton = Button('New bulk edit');
const startBulkEditLocalButton = Button('Start bulk edit (Local)');
const startBulkEditButton = Button('Start bulk edit');
const startBulkEditFolioInstanceButton = Button('FOLIO Instances');
const startBulkEditMarcInstanceButton = Button('Instances with source MARC');
const calendarButton = Button({ icon: 'calendar' });
const nextButton = Button('Next');
const locationLookupModal = Modal('Select permanent location');
const confirmChangesButton = Button('Confirm changes');
const downloadChangedRecordsButton = Button('Download changed records (CSV)');
const downloadChangedMarcRecordsButton = Button('Download changed records (MARC)');
const commitChanges = Button('Commit changes');
const locationSelection = Selection({ name: 'locationId' });
const oldEmail = TextField({ testid: 'input-email-0' });
const newEmail = TextField({ testid: 'input-email-1' });
const closeAreYouSureModalButton = areYouSureForm.find(Button({ icon: 'times' }));
const selectNoteHoldingTypeDropdown = Select({ id: 'noteHoldingsType' });
const saveAndCloseButton = Button('Save & close');
const tagField = TextField({ name: 'tag' });
const ind1Field = TextField({ name: 'ind1' });
const ind2Field = TextField({ name: 'ind2' });
const subField = TextField({ name: 'subfield' });
const dataField = TextArea({ name: 'value' });
const selectActionForMarcInstanceDropdown = Select({ name: 'name', required: true });
const selectActionForMarcInstanceDropdownFirst = Select({ name: 'name', dataActionIndex: '0' });
const noteTypeSelection = Select({ id: or('noteHoldingsType', 'noteType', 'noteInstanceType') });
const statisticalCodeSelection = MultiSelect({ id: 'statisticalCodes' });
const bulkPageSelections = {
  valueType: Selection({ value: including('Select control') }),
  action: Select({ content: including('Select action') }),
  itemStatus: Select({ content: including('Select item status') }),
  patronGroup: Select({ content: including('Select patron group') }),
};

export default {
  openStartBulkEditLocalForm() {
    cy.do(startBulkEditLocalButton.click());
    cy.wait(2000);
  },

  openStartBulkEditFolioInstanceForm() {
    cy.do(startBulkEditFolioInstanceButton.click());
    cy.wait(2000);
  },

  openStartBulkEditMarcInstanceForm() {
    cy.do(startBulkEditMarcInstanceButton.click());
    cy.wait(2000);
  },

  openStartBulkEditForm() {
    cy.wait(1000);
    cy.do(startBulkEditButton.click());
    cy.wait(2000);
  },

  clickSelectBulkEditProfile(recordType) {
    cy.do(Button(`Select ${recordType} bulk edit profile`).click());
  },

  verifyStartBulkEditOptions() {
    cy.expect([
      startBulkEditFolioInstanceButton.exists(),
      startBulkEditMarcInstanceButton.exists(),
    ]);
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

  startBulkEditFolioInstanceAbsent(isAbsent = true) {
    if (isAbsent) {
      cy.expect(startBulkEditFolioInstanceButton.absent());
    } else {
      cy.expect(startBulkEditFolioInstanceButton.exists());
    }
  },

  closeBulkEditInAppForm() {
    cy.do(cancelBtn.click());
    cy.wait(1000);
  },

  verifyConfirmButtonDisabled(isDisabled) {
    cy.wait(500);
    cy.expect(confirmChanges.has({ disabled: isDisabled }));
  },

  selectOption(optionName, rowIndex = 0) {
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(bulkPageSelections.valueType)
        .choose(optionName),
    );
    cy.wait(1000);
  },

  verifyOptionSelected(optionName, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(bulkPageSelections.valueType)
        .has({ singleValue: optionName }),
    );
    cy.wait(1000);
  },

  selectAction(actionName, rowIndex = 0) {
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select({ dataTestID: 'select-actions-0' }))
        .choose(actionName),
    );
  },

  verifyActionSelected(option, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select({ dataTestID: 'select-actions-0' }))
        .has({ checkedOptionText: option }),
    );
  },

  selectSecondAction(actionName, rowIndex = 0) {
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select({ dataTestID: 'select-actions-1' }))
        .choose(actionName),
    );
    cy.wait(500);
  },

  verifySecondActionSelected(option, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
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

  verifyRowIcons(isMarcInstanceAccordion = false) {
    if (isMarcInstanceAccordion) {
      cy.expect([
        bulkEditsMarcInstancesAccordion.find(plusBtn).exists(),
        bulkEditsMarcInstancesAccordion.find(Button({ icon: 'trash', disabled: true })).exists(),
      ]);
    } else {
      cy.expect([
        bulkEditsAccordions.find(plusBtn).exists(),
        bulkEditsAccordions.find(Button({ icon: 'trash', disabled: true })).exists(),
      ]);
    }
  },

  verifyPlusButtonAbsentInRow(isAbsent = true, rowIndex = 0) {
    if (isAbsent) {
      cy.expect(
        bulkEditsAccordions
          .find(RepeatableFieldItem({ index: rowIndex }))
          .find(plusBtn)
          .absent(),
      );
    } else {
      cy.expect(
        bulkEditsAccordions
          .find(RepeatableFieldItem({ index: rowIndex }))
          .find(plusBtn)
          .exists(),
      );
    }
  },

  verifyDeleteButtonExistsInRow(isExists = true, rowIndex = 0) {
    if (isExists) {
      cy.expect(
        bulkEditsAccordions
          .find(RepeatableFieldItem({ index: rowIndex }))
          .find(Button({ icon: 'trash', disabled: false }))
          .exists(),
      );
    } else {
      cy.expect(
        bulkEditsAccordions
          .find(RepeatableFieldItem({ index: rowIndex }))
          .find(deleteBtn)
          .absent(),
      );
    }
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

  verifyLocationValue(value, rowIndex = 0) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Selection({ singleValue: value }))
        .visible(),
    );
  },

  isDisabledRowIcons(isDisabled) {
    cy.expect([plusBtn.exists(), Button({ icon: 'trash', disabled: isDisabled }).exists()]);
    this.verifyConfirmButtonDisabled(true);
  },

  deleteRow(rowIndex = 0) {
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(deleteBtn)
        .click(),
    );
  },

  deleteRowInBulkEditMarcInstancesAccordion(rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('marcFieldRow-') }))
        .find(deleteBtn)
        .click(),
    );
  },

  deleteRowBySelectedOption(option) {
    cy.do(RepeatableFieldItem({ singleValue: option }).find(deleteBtn).click());
  },

  verifyAreYouSureForm(count, cellContent) {
    cy.expect([
      areYouSureForm.has({ numberOfRows: count }),
      areYouSureForm.find(HTML(including(`${count} records will be changed`))).exists(),
      areYouSureForm.find(keepEditingBtn).exists(),
      areYouSureForm.find(downloadPreviewInCSVFormatBtn).exists(),
      areYouSureForm.find(commitChanges).exists(),
    ]);
    if (cellContent) {
      cy.expect(areYouSureForm.find(MultiColumnListCell(cellContent)).exists());
    }
  },

  verifyCellWithContentAbsentsInAreYouSureForm(...cellContent) {
    cellContent.forEach((content) => {
      cy.expect(areYouSureForm.find(MultiColumnListCell(content)).absent());
    });
  },

  verifyDownloadPreviewInMarcFormatButtonEnabled() {
    cy.expect(areYouSureForm.find(downloadPreviewInMarcFormatButton).has({ disabled: false }));
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

  downloadPreviewInMarcFormat() {
    cy.do(downloadPreviewInMarcFormatButton.click());
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

  closeBulkEditForm() {
    cy.do(bulkEditPane.find(Button({ icon: 'times' })).click());
    cy.wait(1000);
  },

  verifyCloseAreYouSureModalButtonDisabled(isDisabled = true) {
    cy.expect(closeAreYouSureModalButton.has({ disabled: isDisabled }));
  },

  closeAreYouSureForm() {
    cy.do(closeAreYouSureModalButton.click());
  },

  clickEscButton() {
    cy.do(Keyboard.escape());
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
    cy.expect(downloadMatchedRecordsButton.exists());
  },

  downloadMatchedRecordsAbsent() {
    cy.expect(downloadMatchedRecordsButton.absent());
  },

  downloadErrorsExists() {
    cy.expect(downloadErrorsButton.exists());
  },

  startBulkEditLocalButtonExists() {
    cy.expect(startBulkEditLocalButton.exists());
  },

  verifyActionAfterChangingRecords() {
    cy.do(actionsBtn.click());
    cy.expect([downloadChangedRecordsButton.exists(), downloadErrorsButton.exists()]);
  },

  verifySuccessBanner(validRecordsCount = 1) {
    cy.wait(2000);
    const recordCount = parseInt(validRecordsCount, 10);
    if (recordCount === 0) {
      cy.expect(changesAccordion.absent());
    } else {
      cy.expect([
        changesAccordion.has({ numberOfRows: recordCount }),
        MessageBanner().has({
          textContent: `${validRecordsCount} records have been successfully changed`,
        }),
      ]);
    }
  },

  verifyLabel(text) {
    cy.expect(Modal().find(HTML(text)).exists());
  },

  cancel() {
    cy.do(Button('Cancel').click());
  },

  replaceWithIsDisabled(rowIndex = 0) {
    cy.expect([
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
    cy.expect([
      RepeatableFieldItem({ index: rowIndex })
        .find(Select({ content: 'Find' }))
        .has({ disabled: true }),
    ]);
    this.verifyConfirmButtonDisabled(true);
    cy.do(oldEmail.fillIn(oldEmailDomain));
    this.verifyConfirmButtonDisabled(true);
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
      RepeatableFieldItem({ index: rowIndex })
        .find(Button('Select control\nSelect location'))
        .click(),
      SelectionOption(including(location)).click(),
    ]);
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

  addNewBulkEditFilterString(isMarcInstanceAccordion = false) {
    if (isMarcInstanceAccordion) {
      cy.do(bulkEditsMarcInstancesAccordion.find(plusBtn).click());
      cy.wait(1000);
    } else {
      cy.do(bulkEditsAccordions.find(plusBtn).click());
      cy.wait(1000);
    }
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

  verifyNewBulkEditRowInMarcInstanceAccordion(rowIndex = 1) {
    cy.expect([
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex - 1 }))
        .find(plusBtn)
        .has({ disabled: false }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex - 1 }))
        .find(deleteBtn)
        .has({ disabled: false }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(plusBtn)
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(deleteBtn)
        .exists(),
      confirmChangesButton.has({ disabled: true }),
    ]);
  },

  verifyNewBulkEditRow(rowIndex = 1) {
    cy.expect([
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex - 1 }))
        .find(plusBtn)
        .absent(),
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex - 1 }))
        .find(deleteBtn)
        .has({ disabled: false }),
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(plusBtn)
        .exists(),
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(deleteBtn)
        .exists(),
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
      TextField({ placeholder: 'MM/DD/YYYY' }).fillIn(formattedDate),
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

  openSelectLoanTypeDropdown(rowIndex = 0) {
    cy.do(
      RepeatableFieldItem({ index: rowIndex })
        .find(Button({ id: 'loanType' }))
        .click(),
    );
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
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(bulkPageSelections.valueType)
        .open(),
    );
    cy.wait(1000);
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

  verifyTheOptionsForChangingNoteType(expectedOptions, rowIndex = 0) {
    cy.then(() => {
      return RepeatableFieldItem({ index: rowIndex }).find(noteTypeSelection).optionsText();
    }).then((actualOptions) => {
      const actualEnabledOptions = actualOptions.filter(
        (actualOption) => !actualOption.includes('Select option'),
      );

      // verify options sorted alphabetically
      const sortedOptions = [...actualEnabledOptions].sort((a, b) => a.localeCompare(b));

      expect(actualEnabledOptions).to.deep.equal(sortedOptions);

      // verify options exist
      expectedOptions.forEach((option) => {
        expect(actualEnabledOptions).to.include(option);
      });
    });
  },

  verifyTheActionOptions(expectedOptions, rowIndex = 0) {
    cy.then(() => {
      cy.wait(1000);
      return bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select('Actions select'))
        .allOptionsText();
    }).then((actualOptions) => {
      const actualEnabledOptions = actualOptions.filter(
        (actualOption) => !actualOption.includes('disabled'),
      );
      expect(actualEnabledOptions).to.deep.equal(expectedOptions);
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
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .fillIn(oldItem),
    );
  },

  verifyValueInFirstTextArea(value, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .has({ value }),
    );
  },

  fillInSecondTextArea(newItem, rowIndex = 0) {
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ dataTestID: 'input-textarea-1' }))
        .fillIn(newItem),
    );
  },

  fillInStatisticaCodeValue(value, rowIndex = 0) {
    cy.do([
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(statisticalCodeSelection)
        .open(),
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(statisticalCodeSelection)
        .fillIn(value),
    ]);
  },

  selectStatisticalCodeValue(value, rowIndex = 0) {
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(statisticalCodeSelection)
        .select(value),
    );
    cy.wait(500);
  },

  verifyStatisticalCodesSortedAlphabetically(rowIndex = 0) {
    cy.do(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(statisticalCodeSelection)
        .open(),
    );
    cy.then(() => {
      return MultiSelectMenu().optionList({ id: 'multiselect-option-list-statisticalCodes' });
    }).then((actualOptions) => {
      const parsedOptions = actualOptions.map((option) => {
        const match = option.match(/^([^:]+):\s*([^-]+)\s*-\s*(.+)\+$/);
        if (match) {
          return {
            original: option,
            type: match[1].trim(),
            code: match[2].trim(),
            name: match[3].trim(),
          };
        }
        return {
          original: option,
          type: '',
          code: '',
          name: option,
        };
      });

      const sortedOptions = [...parsedOptions].sort((a, b) => {
        const typeCompare = a.type.localeCompare(b.type);
        if (typeCompare !== 0) return typeCompare;

        const codeCompare = a.code.localeCompare(b.code);
        if (codeCompare !== 0) return codeCompare;

        return a.name.localeCompare(b.name);
      });

      const actualOrder = parsedOptions.map((opt) => opt.original);
      const expectedOrder = sortedOptions.map((opt) => opt.original);

      expect(actualOrder).to.deep.equal(expectedOrder);
    });
  },

  verifyValueInSecondTextArea(value, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
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
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(bulkPageSelections.valueType)
        .choose(type),
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(bulkPageSelections.action)
        .choose('Find'),
    ]);
  },

  replaceWithAction(option, newValue, rowIndex = 0) {
    this.selectOption(option, rowIndex);
    this.selectAction('Replace with', rowIndex);
    this.verifyActionSelected('Replace with', rowIndex);
    this.fillInFirstTextArea(newValue, rowIndex);
    this.verifyValueInFirstTextArea(newValue, rowIndex);
  },

  noteReplaceWith(noteType, oldNote, newNote, rowIndex = 0) {
    this.findValue(noteType, rowIndex);
    this.fillInFirstTextArea(oldNote, rowIndex);
    this.selectSecondAction('Replace with', rowIndex);
    this.fillInSecondTextArea(newNote, rowIndex);
  },

  urlRelationshipReplaceWith(oldValue, newValue, rowIndex = 0) {
    this.selectOption('URL relationship');
    this.selectAction('Find (full field search)');
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
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(bulkPageSelections.valueType)
        .choose(type),
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(bulkPageSelections.action)
        .choose('Add note'),
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea())
        .fillIn(value),
    ]);
  },

  addItemNoteAndVerify(type, value, rowIndex = 0) {
    this.addItemNote(type, value, rowIndex);
    this.verifyOptionSelected(type, rowIndex);
    this.verifyActionSelected('Add note', rowIndex);
    this.verifyValueInFirstTextArea(value, rowIndex);
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
    this.verifyActionSelected('Change note type', rowIndex);
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(noteTypeSelection)
        .has({ checkedOptionText: newType }),
    );
  },

  selectNoteTypeWhenChangingIt(newType, rowIndex = 0) {
    cy.do([RepeatableFieldItem({ index: rowIndex }).find(noteTypeSelection).choose(newType)]);
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(noteTypeSelection)
        .has({ checkedOptionText: newType }),
    );
  },

  checkApplyToItemsRecordsCheckbox() {
    cy.do(Checkbox('Apply to all items records').click());
  },

  clickApplyToHoldingsRecordsCheckbox() {
    cy.do(Checkbox('Apply to all holdings records').click());
  },

  applyToItemsRecordsCheckboxExists(checked) {
    cy.expect(Checkbox({ label: 'Apply to all items records', checked }).exists());
  },

  applyToHoldingsRecordsCheckboxExists(checked) {
    cy.expect(Checkbox({ label: 'Apply to all holdings records', checked }).exists());
  },

  applyToHoldingsItemsRecordsCheckboxExists(checked) {
    cy.expect([
      this.applyToItemsRecordsCheckboxExists(checked),
      this.applyToHoldingsRecordsCheckboxExists(checked),
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
    cy.wait(1000);
  },

  clickConfirmChangesButton() {
    cy.do(confirmChangesButton.click());
  },

  saveAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  downloadMatchedResults() {
    cy.do(actionsBtn.click());
    cy.wait(500);
    cy.do(downloadMatchedRecordsButton.click());
    BulkEditSearchPane.waitingFileDownload();
  },

  downloadErrors() {
    cy.do(downloadErrorsButton.click());
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
    cy.do([Modal().find(nextButton).click()]);
  },

  verifyNextButtonInCsvModalDisabled(isDisabled = true) {
    cy.expect(Modal().find(nextButton).has({ disabled: isDisabled }));
  },

  verifyNoNewBulkEditButton() {
    cy.expect(newBulkEditButton.absent());
  },

  verifyUsersActionDropdownItemsInCaseOfError() {
    cy.expect([
      DropdownMenu().find(Checkbox('Username')).absent(),
      DropdownMenu().find(Checkbox('User id')).absent(),
      DropdownMenu().find(Checkbox('External System ID')).absent(),
      DropdownMenu().find(Checkbox('Barcode')).absent(),
      DropdownMenu().find(Checkbox('Active')).absent(),
      DropdownMenu().find(Checkbox('Type')).absent(),
      DropdownMenu().find(Checkbox('Patron group')).absent(),
      DropdownMenu().find(Checkbox('Departments')).absent(),
      DropdownMenu().find(Checkbox('Proxy for')).absent(),
      DropdownMenu().find(Checkbox('Last name')).absent(),
      DropdownMenu().find(Checkbox('First name')).absent(),
      DropdownMenu().find(Checkbox('Middle name')).absent(),
      DropdownMenu().find(Checkbox('Preferred first name')).absent(),
      DropdownMenu().find(Checkbox('Email')).absent(),
      DropdownMenu().find(Checkbox('Phone')).absent(),
      DropdownMenu().find(Checkbox('Mobile phone')).absent(),
      DropdownMenu().find(Checkbox('Birth date')).absent(),
      DropdownMenu().find(Checkbox('Addresses')).absent(),
      DropdownMenu().find(Checkbox('Preferred contact type id')).absent(),
      DropdownMenu().find(Checkbox('Date enrolled')).absent(),
      DropdownMenu().find(Checkbox('Expiration date')).absent(),
      DropdownMenu().find(Checkbox('Tags')).absent(),
      DropdownMenu().find(Checkbox('Custom fields')).absent(),
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
    cy.expect(DropdownMenu().find(downloadChangedRecordsButton).exists());
  },

  verifyDownloadChangedRecordsAbsent() {
    cy.expect(DropdownMenu().find(downloadChangedRecordsButton).absent());
  },

  downloadChangedCSV() {
    cy.do(downloadChangedRecordsButton.click());
    BulkEditSearchPane.waitingFileDownload();
  },

  downloadChangedMarc() {
    cy.do(downloadChangedMarcRecordsButton.click());
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
      SelectionOption('Material specified').exists(),
      SelectionOption('URI').exists(),
      SelectionOption('URL public note').exists(),
      SelectionOption('URL relationship').exists(),
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

  verifyOptionExistsInSelectOptionDropdown(option, isExists = true) {
    cy.then(() => {
      return SelectionList({ placeholder: 'Filter options list' }).optionList();
    }).then((list) => {
      if (isExists) {
        expect(list).to.include(option);
      } else {
        expect(list).to.not.include(option);
      }
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

  verifyBulkEditsAccordionExists() {
    cy.expect(bulkEditsAccordion.exists());
  },

  verifyCancelButtonDisabled(isDisabled = true) {
    cy.expect(cancelButton.has({ disabled: isDisabled }));
  },

  verifyMessageBannerInAreYouSureForm(numberOfRecords) {
    cy.expect([
      areYouSureForm.has({ numberOfRows: numberOfRecords }),
      areYouSureForm.find(MessageBanner()).has({
        textContent: `${numberOfRecords} records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.`,
      }),
    ]);
  },

  verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(
    numberOfSupportedInstances,
    numberOfUnsupportedInstances,
  ) {
    cy.expect([
      areYouSureForm.has({ numberOfRows: numberOfSupportedInstances }),
      areYouSureForm.find(MessageBanner()).has({
        textContent: `${numberOfSupportedInstances} records will be changed when the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving. ${numberOfUnsupportedInstances} instances have source that is not supported by MARC records bulk edit and cannot be updated.`,
      }),
    ]);
  },

  verifyActionsColumnIsNotPopulated() {
    cy.expect(bulkEditsAccordion.find(Select({ dataTestID: 'select-actions-1' })).absent());
  },

  verifyActionsSelectDropdownDisabled(rowIndex = 0, isDisabled = true) {
    cy.expect(
      bulkEditsAccordions
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select('Actions select'))
        .has({ disabled: isDisabled }),
    );
  },

  verifySelectOptionsSortedAlphabetically(isInstance = false) {
    this.clickOptionsSelection();

    const group = 'li[class*="groupLabel"]';
    const option = '[class*="optionSegment"]';
    const nextUntilSelector = isInstance
      ? '[class*="selectionList"] li:not([class*="groupedOption"])'
      : group;

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
        .nextUntil(nextUntilSelector)
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

  verifyNoteTypeInNoteHoldingTypeDropdown(noteType, isExist = true, rowIndex = 0) {
    if (isExist) {
      cy.expect(
        RepeatableFieldItem({ index: rowIndex })
          .find(selectNoteHoldingTypeDropdown)
          .has({ content: including(noteType) }),
      );
    } else {
      cy.expect(
        RepeatableFieldItem({ index: rowIndex })
          .find(selectNoteHoldingTypeDropdown)
          .find(Option({ text: noteType }))
          .absent(),
      );
    }
  },

  verifyAreYouSureFormAbsents() {
    cy.expect(areYouSureForm.absent());
  },

  verifyAreYouSureFormWhenUsingMarcFieldsFlowForFolioInstance() {
    cy.expect(areYouSureForm.exists());
    cy.expect(
      areYouSureForm.find(MessageBanner()).has({
        textContent: 'No instances can be updated because none have source MARC.',
      }),
    );
    cy.expect(areYouSureForm.find(HTML('Preview of records to be changed')).exists());
    cy.expect(areYouSureForm.find(HTML('The list contains no items')).exists());
    this.verifyCloseAreYouSureModalButtonDisabled(false);
    this.verifyKeepEditingButtonDisabled(false);
    this.verifyDownloadPreviewButtonDisabled(true);
    cy.expect(areYouSureForm.find(downloadPreviewInMarcFormatButton).has({ disabled: true }));
    cy.expect(areYouSureForm.find(commitChanges).has({ disabled: true }));
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
  verifyFilteredMultiSelectOptionsListIncludesOptionsWithText(value) {
    cy.then(() => MultiSelectMenu().optionList()).then((options) => {
      options.forEach((option) => {
        expect(option.toLowerCase()).to.include(value.toLowerCase());
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

  verifyGroupOptionsInSelectOptionsDropdown(type) {
    this.clickOptionsSelection();

    let expectedOptions;
    let expectedGroupLabels;

    switch (type) {
      case 'item':
        expectedOptions = [
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
        expectedGroupLabels = [
          'Administrative data',
          'Item notes',
          'Loan and availability',
          'Location',
        ];
        break;

      case 'instance':
        expectedOptions = [
          [
            'Administrative note',
            'Set records for deletion',
            'Staff suppress',
            'Statistical code',
            'Suppress from discovery',
          ],
          [
            'Accessibility note',
            'Accumulation and Frequency of Use note',
            'Action note',
            'Additional Physical Form Available note',
            'Awards note',
            'Bibliography note',
            'Binding Information note',
            'Biographical or Historical Data',
            'Cartographic Mathematical Data',
            'Case File Characteristics note',
            'Citation / References note',
            'Copy and Version Identification note',
            'Creation / Production Credits note',
            'Cumulative Index / Finding Aids notes',
            'Data quality note',
            'Date / time and place of an event note',
            'Dissertation note',
            'Entity and Attribute Information note',
            'Exhibitions note',
            'Formatted Contents Note',
            'Former Title Complexity note',
            'Funding Information Note',
            'General note',
            'Geographic Coverage note',
            'Immediate Source of Acquisition note',
            'Information About Documentation note',
            'Information related to Copyright Status',
            'Issuing Body note',
            'Language note',
            'Linking Entry Complexity note',
            'Local notes',
            'Location of Originals / Duplicates note',
            'Location of Other Archival Materials note',
            'Methodology note',
            'Numbering peculiarities note',
            'Original Version note',
            'Ownership and Custodial History note',
            'Participant or Performer note',
            'Preferred Citation of Described Materials note',
            'Publications About Described Materials note',
            'Reproduction note',
            'Restrictions on Access note',
            'Scale note for graphic material',
            'Source of Description note',
            'Study Program Information note',
            'Summary',
            'Supplement note',
            'System Details note',
            'Target Audience note',
            'Terms Governing Use and Reproduction note',
            'Type of computer file or data note',
            'Type of report and period covered note',
            'With note',
          ],
        ];
        expectedGroupLabels = ['Administrative data', 'Instance notes'];
        break;

      case 'holding':
        expectedOptions = [
          ['Administrative note', 'Suppress from discovery'],
          ['Link text', 'Material specified', 'URI', 'URL public note', 'URL relationship'],
          [
            'Action note',
            'Binding',
            'Copy note',
            'Electronic bookplate',
            'Note',
            'Provenance',
            'Reproduction',
          ],
          ['Permanent holdings location', 'Temporary holdings location'],
        ];
        expectedGroupLabels = [
          'Administrative data',
          'Electronic access',
          'Holdings notes',
          'Location',
        ];
        break;

      default:
        throw new Error(
          `Unknown dropdown type: ${type}. Supported types: 'item', 'instance', 'holding'`,
        );
    }

    const groupSelector = 'li[class*="groupLabel"]';

    cy.get(groupSelector).each(($groupLabel, ind) => {
      const labelName = $groupLabel.text();
      expect(labelName).to.eq(expectedGroupLabels[ind]);

      // Verification for non-clickable groups
      cy.wrap($groupLabel).should('not.have.attr', 'aria-selected', 'false');

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
    this.clickOptionsSelection();
  },

  verifySelectLocationDisabled(rowIndex = 0, isDisabled = true) {
    cy.expect(
      RepeatableFieldItem({ index: rowIndex })
        .find(Button({ id: 'locations-esc' }))
        .has({ disabled: isDisabled }),
    );
  },

  verifyInitialStateBulkEditForm() {
    this.verifyBulkEditsAccordionExists();
    this.verifyOptionsDropdown();
    this.verifyRowIcons();
    this.verifyCancelButtonDisabled(false);
    this.verifyConfirmButtonDisabled(true);
  },

  verifyInitialStateBulkEditsFormForMarcInstance() {
    cy.expect([
      bulkEditsAdministrativeDataAccordion.has({ open: true }),
      bulkEditsMarcInstancesAccordion.has({ open: true }),
      Button({ icon: 'times', disabled: false }).exists(),
    ]);
    this.verifyCancelButtonDisabled(false);
    this.verifyConfirmButtonDisabled(true);
  },

  verifyBulkEditMarcFieldsFormHeaderAfterQuery(recordCountAndType, query) {
    cy.expect([
      bulkEditPane
        .find(
          Pane({
            titleLabel: 'Bulk edit MARC fields query',
            subtitle: `${recordCountAndType} records matched`,
          }),
        )
        .exists(),
      bulkEditPane.find(HTML(`Query: ${query}`)).exists(),
    ]);
  },

  verifyInitialStateBulkEditMarcFieldsForm(fileName, recordCountAndType) {
    cy.expect([
      bulkEditPane
        .find(
          Pane({
            titleLabel: `Bulk edit MARC fields - ${fileName}`,
            subtitle: `${recordCountAndType} records matched`,
          }),
        )
        .exists(),
      bulkEditPane
        .find(Pane(`Bulk edit MARC fields - ${fileName}`))
        .find(HTML(`Filename: ${fileName}`))
        .exists(),
      bulkEditsAdministrativeDataAccordion.has({ open: true }),
      bulkEditsMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: including('Field\n*') }))
        .find(HTML({ className: including('icon-info') }))
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: including('Field\n*') }))
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'In.1\n*' }))
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'In.2\n*' }))
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'Subfield\n*' }))
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'Actions\n*' }))
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: 0 }))
        .find(tagField)
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: 0 }))
        .find(ind1Field)
        .has({ value: '\\' }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: 0 }))
        .find(ind2Field)
        .has({ value: '\\' }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: 0 }))
        .find(subField)
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: 0 }))
        .find(selectActionForMarcInstanceDropdown)
        .exists(),
      Button({ icon: 'times' }).exists(),
    ]);
    this.verifyRowIcons();
    this.verifyCancelButtonDisabled(false);
    this.verifyConfirmButtonDisabled(true);
  },

  fillInTagFieldAndVerify(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(tagField)
        .fillIn(value),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(tagField)
        .has({ value }),
    );
  },

  typeValueInTagField(value, rowIndex = 0) {
    cy.do([
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(tagField)
        .focus(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(tagField)
        .perform((el) => {
          cy.wrap(el).type('{selectall}').type(value);
        }),
    ]);
  },

  verifyTagField(value, rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(tagField)
        .has({ value }),
    );
  },

  fillInInd1FieldAndVerify(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .fillIn(value),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .has({ value }),
    );
  },

  typeValueInInd1Field(value, rowIndex = 0) {
    cy.do([
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .focus(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .perform((el) => {
          cy.wrap(el).type('{selectall}').type(value);
        }),
    ]);
  },

  removeValueInInd1Field(rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .perform((el) => {
          cy.wrap(el).clear();
        }),
    );
  },

  verifyInd1Field(value, rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .has({ value }),
    );
  },

  clickInd2Field(rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .perform((el) => cy.wrap(el).find('input').click()),
    );
  },

  clickInd1Field(rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .click(),
    );
  },

  fillInInd2FieldAndVerify(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .fillIn(value),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .has({ value }),
    );
  },

  typeValueInInd2Field(value, rowIndex = 0) {
    cy.do([
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .focus(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .perform((el) => {
          cy.wrap(el).type('{selectall}').type(value);
        }),
    ]);
  },

  verifyInd2Field(value, rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .has({ value }),
    );
  },

  removeValueInInd2Field(rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .perform((el) => {
          cy.wrap(el).clear();
        }),
    );
  },

  fillInSubfieldAndVerify(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(subField)
        .fillIn(value),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(subField)
        .has({ value }),
    );
  },

  typeValueInSubfield(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(subField)
        .perform((el) => cy.wrap(el).find('input').focus()),
    );
    cy.wait(100);
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(subField)
        .perform((el) => {
          cy.wrap(el).find('input').type('{selectall}{del}').type(value);
        }),
    );
  },

  verifySubfield(value, rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(subField)
        .has({ value, focused: true }),
    );
  },

  fillInTagAndIndicatorsAndSubfield(tag, ind1, ind2, subfield, rowIndex = 0) {
    this.fillInTagFieldAndVerify(tag, rowIndex);
    this.fillInInd1FieldAndVerify(ind1, rowIndex);
    this.fillInInd2FieldAndVerify(ind2, rowIndex);
    this.fillInSubfieldAndVerify(subfield, rowIndex);
  },

  verifyTagAndIndicatorsAndSubfieldValues(tag, ind1, ind2, subfield, rowIndex = 0) {
    cy.expect([
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(tagField)
        .has({ value: tag }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind1Field)
        .has({ value: ind1 }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(ind2Field)
        .has({ value: ind2 }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(subField)
        .has({ value: subfield }),
    ]);
  },

  fillInSecondSubfield(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextField({ name: 'value' }))
        .fillIn(value),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextField({ name: 'value' }))
        .has({ value }),
    );
  },

  verifyInvalidValueInSecondSubfield(rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextField({ name: 'value' }))
        .has({ error: 'Please check your input.' }),
    );
  },

  verifyInvalidValueInSubfield(rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(subField)
        .has({ error: 'Please check your input.', errorTextRed: true, errorIcon: true }),
    );
  },

  verifyInvalidValueInIndFields(isInd1Invalid = true, isInd2Invalid = true, rowIndex = 0) {
    const fieldsToCheck = {
      ind1: { shouldCheck: isInd1Invalid, field: ind1Field },
      ind2: { shouldCheck: isInd2Invalid, field: ind2Field },
    };

    Object.values(fieldsToCheck).forEach(({ shouldCheck, field }) => {
      if (shouldCheck) {
        cy.expect(
          bulkEditsMarcInstancesAccordion
            .find(RepeatableFieldItem({ index: rowIndex }))
            .find(field)
            .has({ error: 'Please check your input.', errorTextRed: true, errorIcon: true }),
        );
      }
    });
  },

  verifyInvalidValueInTagField(errorText, rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(tagField)
        .has({
          errorTextRed: true,
          error: errorText,
          errorIcon: true,
        }),
    );
  },

  selectActionForMarcInstance(action, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(selectActionForMarcInstanceDropdown)
        .choose(action),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(selectActionForMarcInstanceDropdownFirst)
        .has({ checkedOptionText: action }),
    );
  },

  selectSecondActionForMarcInstance(action, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select({ name: 'name', dataActionIndex: '1' }))
        .choose(action),
    );
  },

  fillInDataTextAreaForMarcInstance(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ ariaLabel: 'Data' }))
        .fillIn(value),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ ariaLabel: 'Data' }))
        .has({ value }),
    );
  },

  verifyDataColumnAbsent(rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ ariaLabel: 'Data' }))
        .absent(),
    );
  },

  fillInSecondDataTextAreaForMarcInstance(value, rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ name: 'value', dataActionIndex: '1' }))
        .fillIn(value),
    );
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ name: 'value', dataActionIndex: '1' }))
        .has({ value }),
    );
  },

  verifyTheActionOptionsEqual(expectedOptions, isMarcInstancesAccordion = true, rowIndex = 0) {
    const targetAccordion = isMarcInstancesAccordion
      ? bulkEditsMarcInstancesAccordion
      : bulkEditsAccordions;

    cy.then(() => {
      return targetAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select(including('Actions select')))
        .allOptionsText();
    }).then((actualOptions) => {
      const actualEnabledOptions = actualOptions.filter(
        (actualOption) => !actualOption.includes('disabled'),
      );
      expect(actualEnabledOptions).to.deep.equal(expectedOptions);
    });
  },

  verifyTheSecondActionOptionsEqual(
    expectedOptions,
    isMarcInstancesAccordion = true,
    rowIndex = 0,
  ) {
    const targetAccordion = isMarcInstancesAccordion
      ? bulkEditsMarcInstancesAccordion
      : bulkEditsAccordions;

    cy.then(() => {
      return targetAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select({ label: including('Actions select'), dataActionIndex: '1' }))
        .optionsText();
    }).then((actualOptions) => {
      expect(actualOptions).to.deep.equal(expectedOptions);
    });
  },

  verifyAdditionalSubfieldRowInitialState(rowIndex = 0) {
    cy.expect([
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('marcFieldRow-') }))
        .find(plusBtn)
        .absent(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('subRow-') }))
        .find(subField)
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('subRow-') }))
        .find(selectActionForMarcInstanceDropdownFirst)
        .has({ disabled: true, checkedOptionText: 'Add' }),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('subRow-') }))
        .find(dataField)
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('subRow-') }))
        .find(selectActionForMarcInstanceDropdownFirst)
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('subRow-') }))
        .find(plusBtn)
        .exists(),
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(HTML({ className: including('subRow-') }))
        .find(Button({ icon: 'trash', disabled: false }))
        .exists(),
    ]);
  },

  fillInSubfieldInSubRow(value, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .perform((rowEl) => {
          cy.wrap(rowEl)
            .find('[class*="subRow-"]')
            .eq(subRowIndex)
            .find('input[name="subfield"]')
            .clear()
            .type(value);
        }),
    );
  },

  verifyInvalidValueInSubfieldOfSubRow(rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .perform((rowEl) => {
          cy.wrap(rowEl)
            .find('[class*="subRow-"]')
            .eq(subRowIndex)
            .find('[class*="subfield-"]')
            .should('have.text', 'Please check your input.');
        }),
    );
  },

  fillInDataInSubRow(value, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .perform((rowEl) => {
          cy.wrap(rowEl)
            .find('[class*="subRow-"]')
            .eq(subRowIndex)
            .find('textarea[name="value"]')
            .clear()
            .type(value);
        }),
    );
  },

  selectActionInSubRow(action, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .perform((rowEl) => {
          cy.wrap(rowEl)
            .find('[class*="subRow-"]')
            .eq(subRowIndex)
            .find('select[name="name"]')
            .eq(1)
            .select(action);
        }),
    );
  },

  addNewBulkEditFilterStringForMarcInstance(rowIndex = 0) {
    cy.wait(1000);
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(plusBtn)
        .click(),
    );
    cy.wait(1000);
  },

  verifyDataFieldRequired(rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(dataField)
        .has({ required: true }),
    );
  },

  verifySecondDataFieldRequired(rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextArea({ name: 'value', dataActionIndex: '1' }))
        .has({ required: true }),
    );
  },

  verifySecondSubfieldRequired(rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(TextField({ name: 'value' }))
        .has({ required: true }),
    );
  },

  verifySelectActionRequired(rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(selectActionForMarcInstanceDropdown)
        .has({ required: true }),
    );
  },

  verifySelectSecondActionRequired(isRequired = true, rowIndex = 0) {
    cy.expect(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Select({ name: 'name', dataActionIndex: '1' }))
        .has({ required: isRequired }),
    );
  },

  findAndRemoveSubfieldActionForMarc(subfieldValue, rowIndex = 0) {
    this.selectActionForMarcInstance('Find', rowIndex);
    this.verifyDataFieldRequired(rowIndex);
    this.verifySelectSecondActionRequired(true, rowIndex);
    this.fillInDataTextAreaForMarcInstance(subfieldValue, rowIndex);
    this.verifyConfirmButtonDisabled(true);
    this.selectSecondActionForMarcInstance('Remove subfield', rowIndex);
  },

  findAndRemoveFieldActionForMarc(fieldValue, rowIndex = 0) {
    this.selectActionForMarcInstance('Find', rowIndex);
    this.verifyDataFieldRequired(rowIndex);
    this.verifySelectSecondActionRequired(true, rowIndex);
    this.fillInDataTextAreaForMarcInstance(fieldValue, rowIndex);
    this.verifyConfirmButtonDisabled(true);
    this.selectSecondActionForMarcInstance('Remove field', rowIndex);
  },

  findAndReplaceWithActionForMarc(fieldValue, replaceValue, rowIndex = 0) {
    this.selectActionForMarcInstance('Find', rowIndex);
    this.verifyDataFieldRequired(rowIndex);
    this.verifySelectSecondActionRequired(true, rowIndex);
    this.fillInDataTextAreaForMarcInstance(fieldValue, rowIndex);
    this.verifyConfirmButtonDisabled(true);
    this.selectSecondActionForMarcInstance('Replace with', rowIndex);
    this.verifySecondDataFieldRequired(rowIndex);
    this.verifyConfirmButtonDisabled(true);
    this.fillInSecondDataTextAreaForMarcInstance(replaceValue, rowIndex);
  },

  findAndAppendActionForMarc(
    subfieldValueToFind,
    subfieldToAppend,
    subfieldValueToAppend,
    rowIndex = 0,
  ) {
    this.selectActionForMarcInstance('Find', rowIndex);
    this.verifyDataFieldRequired(rowIndex);
    this.verifySelectSecondActionRequired(true, rowIndex);
    this.fillInDataTextAreaForMarcInstance(subfieldValueToFind, rowIndex);
    this.verifyConfirmButtonDisabled(true);
    this.selectSecondActionForMarcInstance('Append', rowIndex);
    this.verifySecondDataFieldRequired(rowIndex);
    this.verifySecondSubfieldRequired(rowIndex);
    this.verifyConfirmButtonDisabled(true);
    this.fillInSecondSubfield(subfieldToAppend, rowIndex);
    this.verifyConfirmButtonDisabled(true);
    this.fillInSecondDataTextAreaForMarcInstance(subfieldValueToAppend, rowIndex);
  },

  addSubfieldActionForMarc(subfieldValue, rowIndex = 0) {
    this.selectActionForMarcInstance('Add', rowIndex);
    this.fillInDataTextAreaForMarcInstance(subfieldValue, rowIndex);
  },

  clickInfoIconNextToSubfieldAndVerifyText(rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .perform((rowEl) => {
          cy.wrap(rowEl).find('[class*="subfield-"]').eq(0).find('button[icon="info"]')
            .click();
        }),
    );
    cy.expect(Popover({ content: 'This field is protected.' }).exists());
  },

  verifyThereIsNoInfoIconNextToSubfield(rowIndex = 0) {
    cy.do(
      bulkEditsMarcInstancesAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .perform((rowEl) => {
          cy.wrap(rowEl)
            .find('[class*="subfield-"]')
            .eq(0)
            .find('button[icon="info"]')
            .should('not.exist');
        }),
    );
  },

  verifyPaneRecordsCountInEditForm(value) {
    cy.expect(bulkEditPane.find(Pane({ subtitle: `${value} records matched` })).exists());
  },

  verifyPatronGroupsAlphabeticalOrder() {
    cy.wait(2000);
    cy.do(
      bulkPageSelections.patronGroup.perform((element) => {
        const options = [...element.querySelectorAll('option')]
          .map((option) => option.textContent)
          .filter((text) => text && text !== 'Select patron group');

        // Verify that options array is not empty
        expect(options.length).to.be.greaterThan(0);

        const sortedOptions = [...options].sort((a, b) => {
          return a.localeCompare(b);
        });

        expect(options).to.deep.equal(sortedOptions);
      }),
    );
  },

  hoverInfoIconAndVerifyText(text) {
    cy.do(bulkEditsMarcInstancesAccordion.find(Icon({ info: true })).hoverMouse());
    cy.expect(Tooltip({ text }).exists());
    cy.do(bulkEditsMarcInstancesAccordion.find(Icon({ info: true })).unhoverMouse());
  },
};
