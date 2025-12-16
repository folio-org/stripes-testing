import { Keyboard } from '@interactors/keyboard';
import {
  Button,
  Checkbox,
  Pane,
  TextField,
  Option,
  Form,
  HTML,
  Accordion,
  Image,
  MultiColumnList,
  Selection,
  SelectionList,
  MultiColumnListCell,
  MultiColumnListHeader,
  PaneHeader,
  including,
} from '../../../../interactors';

export const accordionNames = {
  STARTED_RUNNING: 'Started running',
  ENDED_RUNNING: 'Ended running',
  JOB_PROFILE: 'Job profile',
};

export const fieldNames = {
  FROM: 'From',
  TO: 'To',
};

export const columnNames = {
  FILE_NAME: 'File name',
  STATUS: 'Status',
  TOTAL: 'Total',
  EXPORTED: 'Exported',
  FAILED: 'Failed',
  JOB_PROFILE: 'Job profile',
  STARTED_RUNNING: 'Started running',
  ENDED_RUNNING: 'Ended running',
  RUN_BY: 'Run by',
};

const viewAllLogsButton = Button('View all');
const searchAndFilterPane = Pane('Search & filter');
const idDropdownOption = Option('ID');
const recordSearchTextField = TextField({ id: 'input-record-search' });
const searchForm = Form();
const resetAllButton = Button('Reset all');
const errorsInExportAccordion = Accordion({ headline: 'Errors in export' });
const startedRunningAccordion = Accordion({ headline: 'Started running' });
const endedRunningAccordion = Accordion({ headline: 'Ended running' });
const jobProfileAccordion = Accordion({ headline: 'Job profile' });
const userAccordion = Accordion({ headline: 'User' });
const logsMainPane = Pane('Logs');
const logsIcon = Image({ alt: 'Data export loader for MARC records' });
const recordsFoundText = HTML({ id: 'paneHeaderdata-export-logs-pane-subtitle' });
const logsTable = MultiColumnList();
const errorsInExportYesOptionId = 'clickable-filter-status-fail';
const errorsInExportNoOptionId = 'clickable-filter-status-completed';
const jobProfileSelection = Selection({ singleValue: 'Choose job profile' });
const filterSelectionList = SelectionList({ placeholder: 'Filter options list' });
const emptyListMessage = HTML('-List is empty-');
const clearButton = Button({ icon: 'times-circle-solid' });
const calendarButton = Button({ icon: 'calendar' });
const applyButton = Button('Apply');
const fromDateField = TextField({ name: 'startDate' });
const toDateField = TextField({ name: 'endDate' });

export default {
  openAllJobLogs() {
    cy.do(viewAllLogsButton.click());
  },

  verifyTableWithResultsExists() {
    cy.expect(MultiColumnList().exists());
  },

  verifySearchAndFilterPane() {
    cy.expect(searchAndFilterPane.exists());
  },

  verifyIDOption() {
    cy.expect(idDropdownOption.exists());
  },

  verifyRecordSearch() {
    cy.expect(recordSearchTextField.exists());
  },

  verifySearchButton() {
    cy.expect(searchForm.find(HTML({ text: 'Search' })).exists());
  },

  verifySearchButtonIsDisabled() {
    cy.expect(searchForm.find(Button({ type: 'submit' })).has({ disabled: true }));
  },

  verifyResetAllButton() {
    cy.expect(searchAndFilterPane.find(HTML({ text: 'Reset all' })).exists());
  },

  verifyResetAllIsDisabled(isDisabled = true) {
    cy.expect(resetAllButton.has({ disabled: isDisabled }));
  },

  verifyErrorsInExportAccordion() {
    cy.expect(errorsInExportAccordion.exists());
  },

  verifyErrorsAccordionIsExpanded() {
    cy.expect(errorsInExportAccordion.has({ open: true }));
  },

  verifyStartedRunningAccordion() {
    cy.expect(startedRunningAccordion.exists());
  },

  verifyStartedRunningIsCollapsed() {
    cy.expect(startedRunningAccordion.has({ open: false }));
  },

  verifyEndedRunningAccordion() {
    cy.expect(endedRunningAccordion.exists());
  },

  verifyEndedRunningIsCollapsed() {
    cy.expect(endedRunningAccordion.has({ open: false }));
  },

  verifyJobProfileAccordion() {
    cy.expect(jobProfileAccordion.exists());
  },

  verifyJobProfileIsCollapsed(isCollapsed = true) {
    cy.expect(jobProfileAccordion.has({ open: !isCollapsed }));
  },

  verifyUserAccordionIsCollapsed() {
    cy.expect(userAccordion.has({ open: false }));
  },

  verifyLogsMainPane() {
    cy.expect(logsMainPane.exists());
  },

  verifyLogsIcon() {
    cy.expect(logsIcon.exists());
  },

  verifyRecordsFoundText() {
    cy.expect(recordsFoundText.exists());
  },

  verifyFoundRecordsCount(count) {
    const recordText = count === 1 ? 'record found' : 'records found';

    cy.expect(PaneHeader({ subtitle: including(`${count} ${recordText}`) }).exists());
  },

  verifyLogsTable() {
    cy.expect(logsTable.exists());
    cy.expect(logsTable.find(HTML(columnNames.FILE_NAME)).exists());
    cy.expect(logsTable.find(HTML(columnNames.STATUS)).exists());
    cy.expect(logsTable.find(HTML(columnNames.TOTAL)).exists());
    cy.expect(logsTable.find(HTML(columnNames.EXPORTED)).exists());
    cy.expect(logsTable.find(HTML(columnNames.FAILED)).exists());
    cy.expect(logsTable.find(HTML(columnNames.JOB_PROFILE)).exists());
    cy.expect(logsTable.find(HTML(columnNames.STARTED_RUNNING)).exists());
    cy.get('div.mclScrollable---JvHuN').scrollTo('right');
    cy.wait(500);
    cy.expect(logsTable.find(HTML(columnNames.ENDED_RUNNING)).exists());
    cy.expect(logsTable.find(HTML(columnNames.RUN_BY)).exists());
    cy.expect(logsTable.find(HTML({ id: 'list-column-hrid' })).exists());
  },

  verifyErrorsInExportOptions() {
    cy.expect(errorsInExportAccordion.find(Checkbox('No')).exists());
    cy.expect(errorsInExportAccordion.find(Checkbox('Yes')).exists());
  },

  checkErrorsInExportOption(option) {
    const checkboxToClick = option === 'Yes' ? errorsInExportYesOptionId : errorsInExportNoOptionId;
    cy.get(`#${checkboxToClick}`).check();
  },

  verifyStatusIncludesErrors() {
    cy.expect(logsTable.exists());
    cy.contains('Completed with errors').then((elements) => {
      cy.expect(elements.length > 0);
    });
    cy.contains('Failed').then((elements) => {
      cy.expect(elements.length > 0);
    });
  },

  verifyStatusIncludesAll() {
    cy.expect(logsTable.exists());
    cy.contains('Completed with errors').then((elements) => {
      cy.expect(elements.length > 0);
    });
    cy.contains('Failed').then((elements) => {
      cy.expect(elements.length > 0);
    });
    cy.contains('Completed').then((elements) => {
      cy.expect(elements.length > 0);
    });
  },

  clickTheCrossIcon() {
    cy.do(clearButton.click());
  },

  verifyErrorsInExportCheckbox(option, expected) {
    const checkboxToCheck =
      option === 'Yes'
        ? Checkbox({ id: errorsInExportYesOptionId })
        : Checkbox({ id: errorsInExportNoOptionId });
    cy.expect(checkboxToCheck.has({ checked: expected }));
  },

  resetAll() {
    cy.wait(2000);
    cy.do(resetAllButton.click());
    cy.wait(1000);
  },

  verifyPaginatorExists() {
    cy.get('div[class^="prevNextPaginationContainer-"]').within(() => {
      cy.get('button[data-testid="prev-page-button"]').should('exist');
      cy.get('button[data-testid="next-page-button"]').should('exist');
    });
  },

  expandAccordion(accordionName) {
    cy.do(Accordion(accordionName).clickHeader());
  },

  verifyJobProfileDropdownExists() {
    cy.expect(jobProfileAccordion.find(jobProfileSelection).exists());
  },

  clickJobProfileDropdown() {
    cy.do(jobProfileAccordion.find(Selection()).open());
    cy.wait(1000);
  },

  verifyJobProfileInDropdown(profileName) {
    cy.then(() => filterSelectionList.optionList()).then((options) => {
      cy.expect(options).to.include(profileName);
    });
  },

  verifyJobProfileNotInDropdown(profileName) {
    cy.then(() => filterSelectionList.optionList()).then((options) => {
      cy.expect(options).to.not.include(profileName);
    });
  },

  verifyNumberOfFilteredJobProfiles(expectedCount) {
    cy.then(() => filterSelectionList.optionList()).then((options) => {
      cy.expect(options.length).to.equal(expectedCount);
    });
  },

  filterJobProfileByName(profileName) {
    cy.get('input[placeholder="Filter options list"]').first().clear().type(profileName);
    cy.wait(2000);
  },

  verifyJobProfileHighlightedInOptionsList(profileName) {
    cy.expect(SelectionList().has({ highlighted: profileName }));
  },

  selectFilterOption(option) {
    cy.wait(1000);
    cy.do(SelectionList().select(including(option)));
  },

  verifyResetAllButtonEnabled() {
    cy.expect(resetAllButton.has({ disabled: false }));
  },

  verifyLogsFilteredByJobProfile(profileName) {
    cy.expect(
      logsTable
        .find(MultiColumnListCell({ column: columnNames.JOB_PROFILE, content: profileName }))
        .exists(),
    );
  },

  clickClearJobProfileFilter() {
    cy.do(jobProfileAccordion.find(clearButton).click());
  },

  verifyClearFilterButtonExists(isExist = true) {
    if (isExist) {
      cy.expect(jobProfileAccordion.find(clearButton).exists());
    } else {
      cy.expect(jobProfileAccordion.find(clearButton).absent());
    }
  },

  verifyValueNotInList() {
    cy.expect(filterSelectionList.find(emptyListMessage).exists());
  },

  expandUserAccordion() {
    cy.do(userAccordion.clickHeader());
  },

  verifyUserAccordionExpanded() {
    cy.expect(userAccordion.has({ open: true }));
  },

  verifyUserDropdownExists() {
    cy.expect(userAccordion.find(Selection()).exists());
  },

  clickUserDropdown() {
    cy.do(userAccordion.find(Selection()).open());
    cy.wait(1000);
  },

  filterUserByName(userName) {
    cy.get('input[placeholder="Filter options list"]').eq(1).clear().type(userName);
    cy.wait(2000);
  },

  verifyUserHighlightedInList(firstName, lastName) {
    cy.expect(SelectionList().has({ highlighted: `${firstName} ${lastName}` }));
  },

  selectUserByEnter() {
    cy.get('input[placeholder="Filter options list"]').eq(1).focus();
    cy.wait(1000);
    cy.do([Keyboard.press({ code: 'PageDown' }), Keyboard.press({ code: 'Enter' })]);
    cy.wait(3000);
  },

  verifyClearUserFilterButtonExists(isExist = true) {
    if (isExist) {
      cy.expect(userAccordion.find(clearButton).exists());
    } else {
      cy.expect(userAccordion.find(clearButton).absent());
    }
  },

  clickClearUserFilter() {
    cy.do(userAccordion.find(clearButton).click());
  },

  verifyUserFilterSelected(firstName, lastName) {
    cy.expect(userAccordion.find(Selection({ singleValue: `${firstName} ${lastName}` })).exists());
  },

  verifyLogsFilteredByUser(userName) {
    cy.expect(
      logsTable
        .find(MultiColumnListCell({ column: columnNames.RUN_BY, content: including(userName) }))
        .exists(),
    );
  },

  verifyUsersInAlphabeticalOrder() {
    cy.then(() => filterSelectionList.optionList()).then((options) => {
      const sortedOptions = [...options].sort();

      cy.expect(options).to.deep.equal(sortedOptions);
    });
  },

  verifyUserListScrollable() {
    cy.get('ul[id^="downshift-"][id$="-menu"]').should(($list) => {
      const overflowY = $list.css('overflow-y');
      const containerHeight = $list.height();
      const scrollHeight = $list[0].scrollHeight;

      expect(overflowY).to.equal('auto');
      expect(scrollHeight).to.be.greaterThan(containerHeight);
    });
  },

  verifyAccordionExpanded(accordionName) {
    cy.expect(Accordion(accordionName).has({ open: true }));
  },

  verifyStartedRunningDateFields() {
    cy.expect([
      startedRunningAccordion.find(applyButton).exists(),
      startedRunningAccordion.find(fromDateField).has({ placeholder: 'YYYY-MM-DD' }),
      startedRunningAccordion.find(toDateField).has({ placeholder: 'YYYY-MM-DD' }),
    ]);
  },

  verifyPlaceholderInFieldInAccordion(accordionName, fieldName) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const field = fieldName === fieldNames.FROM ? fromDateField : toDateField;

    cy.expect(accordion.find(field).has({ placeholder: 'YYYY-MM-DD' }));
  },

  verifyCalendarButtonInFieldInAccordion(accordionName, fieldName) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const field = fieldName === fieldNames.FROM ? fromDateField : toDateField;

    cy.expect(accordion.find(field).find(calendarButton).has({ disabled: false }));
  },

  fillDateInFieldInAccordion(accordionName, fieldName, date) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const field = fieldName === fieldNames.FROM ? fromDateField : toDateField;

    cy.do(accordion.find(field).fillIn(date));
  },

  clickApplyButton(accordionName) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;

    cy.do(accordion.find(applyButton).click());
    cy.wait(2000);
  },

  verifyApplyButtonDisabled(isDisabled = true) {
    cy.expect(applyButton.has({ disabled: isDisabled }));
  },

  verifyErrorInFieldInAccordion(accordionName, fieldName, errorMessage) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const field = fieldName === fieldNames.FROM ? fromDateField : toDateField;

    cy.expect(
      accordion.find(field).has({ errorBorder: true, errorIcon: true, error: errorMessage }),
    );
  },

  verifyValidationMessage(accordionName, message, isPresent = true) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;

    if (isPresent) {
      cy.expect(accordion.has({ validationMessage: message }));
    } else {
      cy.expect(HTML(message).absent());
    }
  },

  verifyClearButtonExistsInFieldInAccordion(accordionName, fieldName, exists = true) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const field = fieldName === fieldNames.FROM ? fromDateField : toDateField;

    if (exists) {
      cy.expect(accordion.find(field).find(clearButton).exists());
    } else {
      cy.expect(accordion.find(field).find(clearButton).absent());
    }
  },

  clickClearStartedRunningAccordionFilters() {
    cy.do(
      startedRunningAccordion
        .find(Button({ ariaLabel: 'Clear selected Started running filters' }))
        .click(),
    );
    cy.wait(2000);
  },

  verifyClearAccordionButtonExists(accordionName, isExist = true) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const ariaLabel =
      accordionName === accordionNames.STARTED_RUNNING
        ? 'Clear selected Started running filters'
        : 'Clear selected Ended running filters';

    if (isExist) {
      cy.expect(accordion.find(Button({ ariaLabel })).exists());
    } else {
      cy.expect(accordion.find(Button({ ariaLabel })).absent());
    }
  },

  clickClearButtonInFieldInAccordion(accordionName, fieldName) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const field = fieldName === fieldNames.FROM ? fromDateField : toDateField;

    cy.do(accordion.find(field).find(clearButton).click());
  },

  verifyDateFieldValue(accordionName, fieldName, expectedValue) {
    const accordion =
      accordionName === accordionNames.STARTED_RUNNING
        ? startedRunningAccordion
        : endedRunningAccordion;
    const field = fieldName === fieldNames.FROM ? fromDateField : toDateField;

    cy.expect(accordion.find(field).has({ value: expectedValue }));
  },

  verifyEndedRunningDateFields() {
    cy.expect([
      endedRunningAccordion.find(fromDateField).exists(),
      endedRunningAccordion.find(toDateField).exists(),
      endedRunningAccordion.find(applyButton).exists(),
      endedRunningAccordion.find(fromDateField).has({ placeholder: 'YYYY-MM-DD' }),
      endedRunningAccordion.find(toDateField).has({ placeholder: 'YYYY-MM-DD' }),
    ]);
  },

  clickColumnHeader(columnName) {
    cy.do(MultiColumnListHeader(columnName).click());
    cy.wait(3000);
  },

  getNumberOfFoundRecordsFromSubtitle() {
    return cy
      .get('#paneHeaderdata-export-logs-pane-subtitle')
      .invoke('text')
      .then((text) => {
        const match = text.match(/(\d+)\srecord[s]?\sfound/);

        return match ? parseInt(match[1], 10) : 0;
      });
  },

  verifyColumnSort(columnName, sortDirection) {
    cy.expect(logsTable.find(MultiColumnListHeader(columnName, { sort: sortDirection })).exists());

    cy.get('[id="data-export-logs-pane-content"] [data-row-index] [role="gridcell"]').then(
      ($cells) => {
        const columnIndex = {
          [columnNames.FILE_NAME]: 0,
          [columnNames.STATUS]: 1,
          [columnNames.TOTAL]: 2,
          [columnNames.EXPORTED]: 3,
          [columnNames.FAILED]: 4,
          [columnNames.JOB_PROFILE]: 5,
          [columnNames.STARTED_RUNNING]: 6,
          [columnNames.ENDED_RUNNING]: 7,
          [columnNames.RUN_BY]: 8,
          ID: 9,
        }[columnName];

        const rows = [];
        for (let i = 0; i < $cells.length; i += 10) {
          rows.push($cells[i + columnIndex]);
        }

        const values = rows.map((cell) => cell.textContent.trim());
        const sortedValues = [...values].sort((a, b) => {
          // Handle date columns
          if (
            columnName === columnNames.STARTED_RUNNING ||
            columnName === columnNames.ENDED_RUNNING
          ) {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return sortDirection === 'ascending' ? dateA - dateB : dateB - dateA;
          }
          // Handle text columns
          if (sortDirection === 'ascending') {
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
          } else {
            return b.localeCompare(a, undefined, { sensitivity: 'base' });
          }
        });

        expect(values).to.deep.equal(
          sortedValues,
          `${columnName} should be sorted in ${sortDirection} order`,
        );
      },
    );
  },

  verifyColumnSortIcon(columnName, isExist, sortDirection = null) {
    const columnIdMap = {
      'file name': 'filename',
      status: 'status',
      total: 'total',
      exported: 'exported',
      failed: 'errors',
      'started running': 'starteddate',
      'ended running': 'completeddate',
      'job profile': 'jobprofilename',
      'run by': 'runby',
      id: 'hrid',
    };

    const columnId = `list-column-${columnIdMap[columnName.toLowerCase()] || columnName.toLowerCase().replace(/\s+/g, '')}`;

    cy.get(`#${columnId}`)
      .find('[class^="mclHeaderInner-"]')
      .should(($el) => {
        const afterStyles = window.getComputedStyle($el[0], '::after');
        const backgroundImage = afterStyles.getPropertyValue('background-image');

        if (!isExist) {
          // Verify no sort icon is present
          expect(backgroundImage, `Column "${columnName}" should not have a sort icon`).to.be.oneOf(
            ['none', ''],
          );
        } else {
          // Verify specific sort icon is present
          const descendingPathFragment = 'M7%2011.1L1.23%204.18'; // Downward arrow
          const ascendingPathFragment = 'M7%202.9l5.77%206.92'; // Upward arrow
          const expectedPathFragment =
            sortDirection === 'descending' ? descendingPathFragment : ascendingPathFragment;

          expect(backgroundImage, `Column "${columnName}" should have a sort icon`).to.include(
            'data:image/svg+xml',
          );
          expect(
            backgroundImage,
            `Column "${columnName}" should have ${sortDirection} sort icon`,
          ).to.include(expectedPathFragment);
        }
      });
  },

  verifyStartedRunningDateRangeFilter(fromDate, toDate) {
    cy.get('[id="data-export-logs-pane-content"] [data-row-index] [role="gridcell"]').then(
      ($cells) => {
        const startedRunningColumnIndex = 6;
        const rows = [];
        for (let i = 0; i < $cells.length; i += 10) {
          rows.push($cells[i + startedRunningColumnIndex]);
        }

        const startedRunningValues = rows.map((cell) => cell.textContent.trim());
        const fromDateTime = new Date(fromDate).setHours(0, 0, 0, 0);
        const toDateTime = new Date(toDate).setHours(23, 59, 59, 999);

        startedRunningValues.forEach((dateStr, index) => {
          const cellDate = new Date(dateStr).getTime();
          expect(
            cellDate,
            `Row ${index}: "${dateStr}" should be between ${fromDate} and ${toDate}`,
          ).to.be.at.least(fromDateTime);
          expect(
            cellDate,
            `Row ${index}: "${dateStr}" should be between ${fromDate} and ${toDate}`,
          ).to.be.at.most(toDateTime);
        });
      },
    );
  },

  verifyNoResultsFound() {
    cy.expect(logsMainPane.find(HTML('The list contains no items')).exists());
  },
};
