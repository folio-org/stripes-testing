import { HTML } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnList,
  Pane,
  including,
  MultiColumnListRow,
  TextField,
  SelectionOption,
  Selection,
} from '../../../../interactors';
import { ListRow } from '../../../../interactors/multi-column-list';
import BulkEditSearchPane from './bulk-edit-search-pane';

const bulkEditPane = Pane(including('Bulk edit'));
const logsToggle = Button('Logs');
const logsStartDateAccordion = Accordion('Started');
const logsEndDateAccordion = Accordion('Ended');
const applyBtn = Button('Apply');
const logsResultPane = Pane({ id: 'bulk-edit-logs-pane' });
const recordTypesAccordion = Accordion({ label: 'Record types' });
const usersCheckbox = Checkbox('Users');
const holdingsCheckbox = Checkbox('Inventory - holdings');
const itemsCheckbox = Checkbox('Inventory - items');
const instancesCheckbox = Checkbox('Inventory - instances');
const resetAllButton = Button('Reset all');
const logsStatusesAccordion = Accordion('Statuses');
const logsUsersAccordion = Accordion('User');
const clearAccordionButton = Button({ icon: 'times-circle-solid' });
const usersSelectionList = Selection();
const textFieldTo = TextField('To');
const textFieldFrom = TextField('From');
const triggerBtn = DropdownMenu().find(Button('File that was used to trigger the bulk edit'));
const errorsEncounteredBtn = DropdownMenu().find(
  Button('File with errors encountered during the record matching'),
);
const matchingRecordsBtn = DropdownMenu().find(Button('File with the matching records'));
const previewPorposedChangesBtn = DropdownMenu().find(
  Button('File with the preview of proposed changes (CSV)'),
);
const previewPorposedChangesMarcBtn = DropdownMenu().find(
  Button('File with the preview of proposed changes (MARC)'),
);
const updatedRecordBtn = DropdownMenu().find(Button('File with updated records (CSV)'));
const updatedRecordMarcBtn = DropdownMenu().find(Button('File with updated records (MARC)'));
const errorsCommittingBtn = DropdownMenu().find(
  Button('File with errors encountered when committing the changes'),
);
const queryIdentifiersBtn = DropdownMenu().find(
  Button('File with identifiers of the records affected by bulk update'),
);
const logsActionButton = Button({ icon: 'ellipsis' });
const newCheckbox = Checkbox('New');
const retrievingRecordsCheckbox = Checkbox('Retrieving records');
const savingRecordsCheckbox = Checkbox('Saving records');
const dataModificationCheckbox = Checkbox('Data modification');
const reviewingChangesCheckbox = Checkbox('Reviewing changes');
const completedCheckbox = Checkbox('Completed');
const completedWithErrorsCheckbox = Checkbox('Completed with errors');
const failedCheckbox = Checkbox('Failed');
const previousPaginationButton = Button('Previous');
const nextPaginationButton = Button('Next');

export default {
  waitLogsTableLoading() {
    cy.expect(logsResultPane.find(MultiColumnList()).exists());
  },

  resetAllBtnIsDisabled(isDisabled) {
    cy.expect(resetAllButton.has({ disabled: isDisabled }));
  },

  resetAll() {
    cy.do(resetAllButton.click());
  },

  logActionsIsAbsent() {
    cy.expect(logsActionButton.absent());
  },

  verifyLogActionsButtonAbsentInARow(jobHrid) {
    cy.then(() => MultiColumnListCell({ content: jobHrid, column: 'ID' }).row()).then((index) => {
      cy.expect(
        MultiColumnListRow({ indexRow: `row-${index}` })
          .find(logsActionButton)
          .absent(),
      );
    });
  },

  verifyCheckboxIsSelected(checkbox, isChecked = false) {
    cy.expect(Checkbox({ name: checkbox }).has({ checked: isChecked }));
  },

  verifyLogsPane() {
    this.verifyLogsStatusesAccordionExistsAndUnchecked();
    cy.expect([
      logsToggle.has({ default: false }),
      resetAllButton.has({ disabled: true }),
      recordTypesAccordion.find(usersCheckbox).has({ checked: false }),
      recordTypesAccordion.find(itemsCheckbox).has({ checked: false }),
      recordTypesAccordion.find(holdingsCheckbox).has({ checked: false }),
      recordTypesAccordion.find(instancesCheckbox).has({ checked: false }),
      logsStartDateAccordion.has({ open: false }),
      logsEndDateAccordion.has({ open: false }),
      bulkEditPane.find(HTML('Bulk edit logs')).exists(),
      bulkEditPane.find(HTML('Enter search criteria to start search')).exists(),
      bulkEditPane.find(HTML('Choose a filter to show results.')).exists(),
    ]);
  },

  verifyLogsPaneHeader() {
    cy.expect([
      bulkEditPane.find(HTML('Bulk edit logs')).exists(),
      bulkEditPane.find(HTML(including('records found'))).exists(),
    ]);
  },

  checkLogsCheckbox(status) {
    cy.do(Checkbox(status).click());
  },

  resetStatuses() {
    cy.do(
      Accordion('Statuses')
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
  },

  checkHoldingsCheckbox() {
    cy.do(holdingsCheckbox.click());
  },

  checkItemsCheckbox() {
    cy.do(itemsCheckbox.click());
  },

  checkUsersCheckbox() {
    cy.do(usersCheckbox.click());
  },

  checkInstancesCheckbox() {
    cy.do(instancesCheckbox.click());
  },

  verifyRecordTypesSortedAlphabetically() {
    const locator = '#entityType [class*="labelText"]';
    cy.get(locator).then((checkboxes) => {
      const textArray = checkboxes.get().map((el) => el.innerText);
      const sortedArray = [...textArray].sort((a, b) => a - b);
      expect(sortedArray).to.eql(textArray);
    });
  },

  verifyCellsValues(column, status) {
    cy.wait(2000);
    BulkEditSearchPane.getMultiColumnListCellsValues(column)
      .should('have.length.at.least', 1)
      .each((value) => {
        expect(value).to.eq(status);
      });
  },

  verifyRecordTypesValues(
    expectedRecordTypes = ['Inventory - instances', 'Inventory - instances (MARC)'],
  ) {
    cy.wait(2000);
    BulkEditSearchPane.getMultiColumnListCellsValues(1)
      .should('have.length.at.least', 1)
      .each((value) => {
        expect(expectedRecordTypes).to.include(value);
      });
  },

  verifyDateCellsValues(column, fromDate, toDate) {
    BulkEditSearchPane.getMultiColumnListCellsValues(column)
      .should('have.length.at.least', 1)
      .each((value) => {
        if (!value.includes('No value set')) {
          const cellDate = new Date(value);
          const to = new Date(toDate);
          to.setDate(to.getDate() + 1);
          expect(cellDate).to.greaterThan(new Date(fromDate));
          expect(cellDate).to.lessThan(to);
        }
      });
  },

  clickLogsStatusesAccordion() {
    cy.do(logsStatusesAccordion.clickHeader());
  },

  clickLogsStartedAccordion() {
    cy.do(logsStartDateAccordion.clickHeader());
  },

  clickLogsEndedAccordion() {
    cy.do(logsEndDateAccordion.clickHeader());
  },

  verifyLogsStatusesAccordionCollapsed() {
    cy.expect([
      logsStatusesAccordion.has({ open: false }),
      newCheckbox.absent(),
      retrievingRecordsCheckbox.absent(),
      savingRecordsCheckbox.absent(),
      dataModificationCheckbox.absent(),
      reviewingChangesCheckbox.absent(),
      completedCheckbox.absent(),
      completedWithErrorsCheckbox.absent(),
      failedCheckbox.absent(),
    ]);
  },

  verifyLogsRecordTypesAccordionCollapsed() {
    BulkEditSearchPane.recordTypesAccordionExpanded(false);
    cy.expect([usersCheckbox.absent(), holdingsCheckbox.absent(), itemsCheckbox.absent()]);
  },

  verifyLogsStatusesAccordionExistsAndUnchecked() {
    cy.expect([
      logsStatusesAccordion.has({ open: true }),
      newCheckbox.has({ checked: false }),
      retrievingRecordsCheckbox.has({ checked: false }),
      savingRecordsCheckbox.has({ checked: false }),
      dataModificationCheckbox.has({ checked: false }),
      reviewingChangesCheckbox.has({ checked: false }),
      completedCheckbox.has({ checked: false }),
      completedWithErrorsCheckbox.has({ checked: false }),
      failedCheckbox.has({ checked: false }),
    ]);
  },

  verifyLogsRecordTypesAccordionExistsAndUnchecked() {
    BulkEditSearchPane.recordTypesAccordionExpanded(true);
    cy.expect([
      usersCheckbox.has({ checked: false }),
      holdingsCheckbox.has({ checked: false }),
      itemsCheckbox.has({ checked: false }),
    ]);
  },

  verifyLogsStartedAccordionExistsWithElements() {
    cy.expect([
      logsStartDateAccordion.has({ open: true }),
      logsStartDateAccordion
        .find(textFieldFrom)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsStartDateAccordion
        .find(textFieldTo)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsStartDateAccordion.find(textFieldFrom).has({ placeholder: 'YYYY-MM-DD' }),
      logsStartDateAccordion.find(textFieldTo).has({ placeholder: 'YYYY-MM-DD' }),
      logsStartDateAccordion.find(applyBtn).exists(),
    ]);
  },

  verifyDateFieldWithError(accordion, textField, errorMessage) {
    cy.expect([
      Accordion(accordion).find(TextField(textField)).has({ errorIcon: true }),
      Accordion(accordion).find(TextField(textField)).has({ errorBorder: true }),
      Accordion(accordion).find(TextField(textField)).has({ error: errorMessage }),
    ]);
  },

  verifyDateAccordionValidationMessage(accordion, message) {
    cy.expect(Accordion(accordion).has({ validationMessage: message }));
  },

  verifyLogsEndedAccordionExistsWithElements() {
    cy.expect([
      logsEndDateAccordion.has({ open: true }),
      logsEndDateAccordion
        .find(textFieldFrom)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsEndDateAccordion
        .find(textFieldTo)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsEndDateAccordion.find(textFieldFrom).has({ placeholder: 'YYYY-MM-DD' }),
      logsEndDateAccordion.find(textFieldTo).has({ placeholder: 'YYYY-MM-DD' }),
      logsEndDateAccordion.find(applyBtn).exists(),
    ]);
  },

  verifyLogsDateFilledIsEqual(accordion, fieldName, valueToVerify) {
    cy.expect(Accordion(accordion).find(TextField(fieldName)).has({ value: valueToVerify }));
  },

  verifyClearSelectedFiltersButton(accordion, verification = 'exists') {
    cy.expect(
      Accordion(accordion)
        .find(Button({ icon: 'times-circle-solid' }))
        // eslint-disable-next-line no-unexpected-multiline
        [verification](),
    );
  },

  clickUserAccordion() {
    cy.do(logsUsersAccordion.clickHeader());
  },

  selectUserFromDropdown(name) {
    this.clickChooseUserUnderUserAccordion();
    cy.do([usersSelectionList.choose(including(name))]);
  },

  fillUserFilterInput(userName) {
    this.clickChooseUserUnderUserAccordion();
    cy.do([usersSelectionList.filterOptions(userName)]);
  },

  verifyUserIsNotInUserList(name) {
    cy.expect(usersSelectionList.find(SelectionOption(including(name))).absent());
  },

  verifyUserIsInUserList(name) {
    cy.expect(SelectionOption(including(name)).exists());
  },

  verifyEmptyUserDropdown() {
    cy.expect([HTML('-List is empty-').exists(), HTML('No matching options').exists()]);
  },

  verifyUserAccordionCollapsed() {
    cy.expect(Accordion('User').has({ open: false }));
  },

  clickChooseUserUnderUserAccordion() {
    cy.wait(2000);
    cy.do(logsUsersAccordion.find(Button(including('Select control'))).click());
    cy.wait(2000);
  },

  verifyClearSelectedButtonExists(accordion, presence = true) {
    cy.wait(1000);
    if (presence) {
      cy.expect(Accordion(accordion).find(clearAccordionButton).exists());
    } else {
      cy.expect(Accordion(accordion).find(clearAccordionButton).absent());
    }
  },

  clickClearSelectedButton(accordion) {
    cy.do(Accordion(accordion).find(clearAccordionButton).click());
  },

  verifyClearSelectedDateButtonExists(accordion, textField) {
    cy.expect(
      Accordion(accordion)
        .find(TextField({ label: textField }))
        .find(Button({ icon: 'times-circle-solid' }))
        .exists(),
    );
  },

  clickClearSelectedFiltersButton(accordion) {
    cy.do(
      Accordion(accordion)
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
  },

  clickClearStartedFilter() {
    cy.do(
      logsStartDateAccordion.find(Button({ ariaLabel: 'Clear selected Started filters' })).click(),
    );
  },

  clickClearSelectedDateButton(accordion, textField) {
    cy.do(
      Accordion(accordion)
        .find(TextField({ label: textField }))
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
  },

  clickActionsOnTheRow(row = 0) {
    cy.do(
      MultiColumnListRow({ indexRow: `row-${row}` })
        .find(logsActionButton)
        .click(),
    );
  },

  verifyLogStatus(runByUsername, content) {
    cy.expect(
      ListRow({ text: including(runByUsername) })
        .find(MultiColumnListCell({ content }))
        .exists(),
    );
  },

  verifyOperationHrid(runByUsername, operationHrid) {
    cy.expect(
      ListRow({ text: including(runByUsername) })
        .find(MultiColumnListCell({ content: operationHrid }))
        .exists(),
    );
  },

  verifyEditingColumnValue(runByUsername, content) {
    cy.expect(
      ListRow({ text: including(runByUsername) })
        .find(MultiColumnListCell({ content, column: 'Editing' }))
        .exists(),
    );
  },

  clickActionsRunBy(runByUsername) {
    cy.do(
      ListRow({ text: including(runByUsername) })
        .find(logsActionButton)
        .click(),
    );
  },

  clickActionsByJobHrid(jobHrid) {
    cy.then(() => MultiColumnListCell({ content: jobHrid, column: 'ID' }).row()).then((index) => {
      cy.do(
        MultiColumnListRow({ indexRow: `row-${index}` })
          .find(logsActionButton)
          .click(),
      );
    });
  },

  verifyActionsRunBy(name) {
    cy.expect(ListRow({ text: including(`\n${name}\n`) }).exists());
  },

  verifyTriggerLogsAction() {
    cy.expect(triggerBtn.exists());
  },

  verifyLogsRowAction() {
    cy.expect([triggerBtn.exists(), errorsEncounteredBtn.exists()]);
  },

  verifyLogsRowActionWhenCompleted(isMarcInstance = false) {
    cy.expect([
      triggerBtn.exists(),
      matchingRecordsBtn.exists(),
      previewPorposedChangesBtn.exists(),
      updatedRecordBtn.exists(),
    ]);

    if (isMarcInstance) {
      cy.expect(previewPorposedChangesMarcBtn.exists());
      cy.expect(updatedRecordMarcBtn.exists());
    }
  },

  verifyLogsRowActionWhenCompletedWithQuery(isMarcInstance = false) {
    cy.expect([
      queryIdentifiersBtn.exists(),
      matchingRecordsBtn.exists(),
      previewPorposedChangesBtn.exists(),
      updatedRecordBtn.exists(),
    ]);

    if (isMarcInstance) {
      cy.expect(previewPorposedChangesMarcBtn.exists());
      cy.expect(updatedRecordMarcBtn.exists());
    }
  },

  verifyLogsRowActionWhenNoChangesApplied() {
    cy.expect([
      triggerBtn.exists(),
      matchingRecordsBtn.exists(),
      previewPorposedChangesBtn.exists(),
      errorsCommittingBtn.exists(),
    ]);
  },

  verifyLogsRowActionWhenCompletedWithErrors() {
    cy.expect([
      triggerBtn.exists(),
      matchingRecordsBtn.exists(),
      errorsEncounteredBtn.exists(),
      previewPorposedChangesBtn.exists(),
      updatedRecordBtn.exists(),
      errorsCommittingBtn.exists(),
    ]);
  },

  verifyLogsRowActionWithoutMatchingErrorWithCommittingErrors() {
    cy.expect([
      triggerBtn.exists(),
      matchingRecordsBtn.exists(),
      previewPorposedChangesBtn.exists(),
      updatedRecordBtn.exists(),
      errorsCommittingBtn.exists(),
    ]);
  },

  verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery() {
    cy.expect([
      queryIdentifiersBtn.exists(),
      matchingRecordsBtn.exists(),
      previewPorposedChangesBtn.exists(),
      updatedRecordBtn.exists(),
      errorsCommittingBtn.exists(),
    ]);
  },

  verifyLogsRowActionWhenCompletedWithErrorsWithoutModification() {
    cy.expect([triggerBtn.exists(), errorsEncounteredBtn.exists()]);
  },

  verifyLogsRowActionWhenRunQuery() {
    cy.expect([queryIdentifiersBtn.exists(), matchingRecordsBtn.exists()]);
  },

  waitingFileDownload() {
    cy.wait(3000);
  },

  downloadQueryIdentifiers() {
    cy.do(queryIdentifiersBtn.click());
    this.waitingFileDownload();
  },

  downloadFileUsedToTrigger() {
    cy.do(triggerBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithErrorsEncountered() {
    cy.do(errorsEncounteredBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithMatchingRecords() {
    cy.do(matchingRecordsBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithProposedChanges() {
    cy.do(previewPorposedChangesBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithProposedChangesMarc() {
    cy.do(previewPorposedChangesMarcBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithUpdatedRecords() {
    cy.do(updatedRecordBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithUpdatedRecordsMarc() {
    cy.do(updatedRecordMarcBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithCommitErrors() {
    cy.do(errorsCommittingBtn.click());
    this.waitingFileDownload();
  },

  verifyLogsTableHeaders(verification = 'exists') {
    cy.get('div[class^="mclScrollable"]')
      .should('exist')
      .scrollTo('right', { ensureScrollable: false });
    cy.expect([
      MultiColumnListHeader('Record type')[verification](),
      MultiColumnListHeader('Status')[verification](),
      MultiColumnListHeader('Editing')[verification](),
      MultiColumnListHeader('# of records')[verification](),
      MultiColumnListHeader('Processed')[verification](),
      MultiColumnListHeader('Started')[verification](),
      MultiColumnListHeader('Ended')[verification](),
      MultiColumnListHeader('Run by')[verification](),
      MultiColumnListHeader('ID')[verification](),
      MultiColumnListHeader('Actions')[verification](),
    ]);
  },

  fillLogsDate(accordion, dataPicker, value) {
    cy.do(Accordion(accordion).find(TextField(dataPicker)).fillIn(value));
  },

  fillLogsStartDate(fromDate, toDate) {
    cy.do([
      logsStartDateAccordion.clickHeader(),
      logsStartDateAccordion.find(textFieldFrom).fillIn(fromDate),
      logsStartDateAccordion.find(textFieldTo).fillIn(toDate),
    ]);
  },

  fillLogsEndDate(fromDate, toDate) {
    cy.do([
      logsEndDateAccordion.clickHeader(),
      logsEndDateAccordion.find(textFieldFrom).fillIn(fromDate),
      logsEndDateAccordion.find(textFieldTo).fillIn(toDate),
    ]);
  },

  applyStartDateFilters() {
    cy.do(logsStartDateAccordion.find(applyBtn).click());
  },

  applyEndDateFilters() {
    cy.do(logsEndDateAccordion.find(applyBtn).click());
    cy.wait(2000);
  },

  verifyLogsStartedAccordionCollapsed() {
    cy.expect([
      logsStartDateAccordion.has({ open: false }),
      logsStartDateAccordion.find(textFieldFrom).absent(),
      logsStartDateAccordion.find(textFieldTo).absent(),
    ]);
  },

  verifyLogsEndedAccordionCollapsed() {
    cy.expect([
      logsEndDateAccordion.has({ open: false }),
      logsEndDateAccordion.find(textFieldFrom).absent(),
      logsEndDateAccordion.find(textFieldTo).absent(),
    ]);
  },

  verifyDirection(header, direction = 'descending') {
    cy.wait(3000);
    cy.get('[class^="mclHeader"]')
      .contains(header)
      .then((mclHeader) => {
        const sort = mclHeader.prevObject[1].getAttribute('aria-sort');
        expect(sort).to.eq(direction);
      });
  },

  verifyNoDirection(header) {
    cy.get('[class^="mclHeader"]')
      .contains(header)
      .then((mclHeader) => {
        const sort = mclHeader.prevObject[1].getAttribute('aria-sort');
        expect(sort).to.eq('none');
      });
  },

  clickLogHeader(header) {
    cy.do(MultiColumnListHeader(header).click());
    cy.wait(2000);
  },

  noLogResultsFound() {
    cy.expect(logsResultPane.find(HTML('No results found. Please check your filters.')).exists());
  },

  verifyLogResultsFound() {
    cy.expect(logsResultPane.find(MultiColumnList()).exists());
  },

  verifyLogsPagination(recordsNumber, isNextButtonDisabled = true) {
    cy.expect([
      logsResultPane.find(previousPaginationButton).has({ disabled: true }),
      logsResultPane.find(nextPaginationButton).has({ disabled: isNextButtonDisabled }),
    ]);
    cy.get('div[class^="prevNextPaginationContainer-"]')
      .eq(0)
      .find('div')
      .invoke('text')
      .should('eq', `1 - ${recordsNumber}`);
  },
};
