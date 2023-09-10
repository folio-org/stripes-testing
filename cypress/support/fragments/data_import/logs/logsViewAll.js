/* eslint-disable cypress/no-unnecessary-waiting */
import { or, HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  MultiColumnList,
  MultiColumnListHeader,
  Select,
  Selection,
  SelectionList,
  TextField,
  Pane,
  Checkbox,
  MultiColumnListCell,
  Modal,
  Link,
} from '../../../../../interactors';
import UrlParams from '../url-params';
import InteractorsTools from '../../../utils/interactorsTools';

const singleRecordImportsAccordion = Accordion('Inventory single record imports');
const dataImportList = MultiColumnList({ id: 'list-data-import' });
const errorsInImportAccordion = Accordion('Errors in import');
const selectAllCheckbox = Checkbox({ name: 'selected-all' });

function getCheckboxByRow(row) {
  return MultiColumnList()
    .find(MultiColumnListCell({ row, columnIndex: 0 }))
    .find(Checkbox());
}

const verifyMessageOfDeleted = (quantity) => {
  InteractorsTools.checkCalloutMessage(
    `${quantity} data import logs have been successfully deleted.`,
  );
  InteractorsTools.closeCalloutMessage();
};

const columnName = {
  status: dataImportList.find(MultiColumnListHeader({ id: 'list-column-status' })),
  jobProfile: dataImportList.find(MultiColumnListHeader({ id: 'list-column-jobprofilename' })),
  runBy: dataImportList.find(MultiColumnListHeader({ id: 'list-column-runby' })),
};

function waitUIToBeFiltered() {
  // Need some waiting when jobs list is long, UI takes longer to be filtered
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(1800);
}

function checkByErrorsInImport(...status) {
  waitUIToBeFiltered();
  return cy.get('#list-data-import').then((element) => {
    // only 100 records shows on every page
    const resultCount =
      element.attr('data-total-count') > 99 ? 99 : element.attr('data-total-count');

    // verify every string in result table
    for (let i = 0; i < resultCount; i++) {
      cy.expect(MultiColumnListCell({ content: or(...status), row: i }).exists());
    }
  });
}

function checkByUserName(userName) {
  waitUIToBeFiltered();
  return cy.get('#list-data-import').then((element) => {
    // only 100 records shows on every page
    const resultCount =
      element.attr('data-total-count') > 99 ? 99 : element.attr('data-total-count');

    // verify every string in result table
    for (let i = 0; i < resultCount; i++) {
      cy.expect(MultiColumnListCell({ content: userName, row: i }).exists());
    }
  });
}

export default {
  verifyMessageOfDeleted,
  waitUIToBeFiltered,
  checkByErrorsInImport,
  checkByUserName,
  columnName,

  selectOption(option) {
    return cy.do([Select({ id: 'input-job-logs-search-qindex' }).choose(option)]);
  },

  searchWithTerm(term) {
    cy.get('#input-job-logs-search').clear().type(term);
    cy.do(Button('Search').click());
    // need to wait until search list is populated
    cy.wait(1500);
  },

  checkRowsCount(rowCount) {
    if (rowCount === 0) {
      cy.expect(MultiColumnList().absent());
    } else {
      cy.expect(MultiColumnList({ id: 'list-data-import' }).has({ rowCount }));
    }
  },

  checkById({ id }) {
    const queryString = UrlParams.getSearchByIdQueryString({ id });
    this.getNumberOfMatchedJobs(queryString).then((count) => {
      this.checkRowsCount(count);
    });
  },

  options: ['Keyword (ID, File name)', 'ID', 'File name'],

  errorsInImportStatuses: ['No', 'Yes'],

  singleRecordImportsStatuses: ['Yes', 'No'],

  resetAllFilters() {
    cy.do(Button('Reset all').click());

    // After resetting all filters, we need to sort MultiColumnList
    // Otherwise, server cannot parse request params and returns error with 422 status
    // In this case, sort by completed date in ascending order
    cy.do(MultiColumnListHeader('Ended running').click());
    waitUIToBeFiltered();
  },

  selectYesfilterJobsByErrors: () => {
    cy.do(
      errorsInImportAccordion.find(Checkbox({ id: 'clickable-filter-statusAny-error' })).click(),
    );
  },

  selectNofilterJobsByErrors: () => {
    cy.do(
      errorsInImportAccordion
        .find(Checkbox({ id: 'clickable-filter-statusAny-committed' }))
        .click(),
    );
  },

  filterJobsByDate({ from, end }) {
    cy.do([
      Accordion({ id: 'completedDate' }).clickHeader(),
      TextField({ label: 'From' }).fillIn(from),
      TextField({ label: 'To' }).fillIn(end),
      Button('Apply').click(),
    ]);
  },

  filterJobsByJobProfile(jobProfile) {
    cy.do([
      Accordion({ id: 'profileIdAny' }).clickHeader(),
      Accordion({ id: 'profileIdAny' })
        .find(Selection({ singleValue: 'Choose job profile' }))
        .open(),
      SelectionList().select(jobProfile),
    ]);
  },

  openUserIdAccordion() {
    cy.do(Accordion({ id: 'userId' }).clickHeader());
  },

  filterJobsByUser(user) {
    cy.do([Selection({ singleValue: 'Choose user' }).open(), SelectionList().select(user)]);
  },

  filterJobsByInventorySingleRecordImports(filter) {
    cy.do(singleRecordImportsAccordion.find(Checkbox({ name: filter.toLowerCase() })).click());
  },

  // TODO: redesign to interactors
  getMultiColumnListCellsValues(cell) {
    const cells = [];

    // get MultiColumnList rows and loop over
    return cy
      .get('[data-row-index]')
      .each(($row) => {
        // from each row, choose specific cell
        cy.get(`[class*="mclCell-"]:nth-child(${cell})`, { withinSubject: $row })
          // extract its text content
          .invoke('text')
          .then((cellValue) => {
            cells.push(cellValue);
          });
      })
      .then(() => cells);
  },

  visibleColumns: {
    FILE_NAME: { columnIndex: 2 },
    STATUS: { columnIndex: 3 },
    RECORDS: { columnIndex: 4 },
    JOB_PROFILE: { columnIndex: 5 },
    STARTED_RUNNING: { columnIndex: 6 },
    ENDED_RUNNING: { columnIndex: 7 },
    RUN_BY: { columnIndex: 8 },
  },

  checkByReverseChronologicalOrder() {
    this.getMultiColumnListCellsValues(this.visibleColumns.ENDED_RUNNING.columnIndex).then(
      (cells) => {
        // convert each cell value to Date object
        const dates = cells.map((cell) => new Date(cell));

        // create new array from the dates and sort this array in descending order
        const sortedDates = [...dates].sort((a, b) => b - a);

        // if job logs are sorted by default in reverse chronological order
        // the dates and sortedDates should be equal
        expect(dates).to.deep.equal(sortedDates);
      },
    );
  },

  checkByDate({ from, end }) {
    const queryString = UrlParams.getDateQueryString({ from, end });

    return this.getNumberOfMatchedJobs(queryString).then((count) => {
      // ensure MultiColumnList is filtered by Date
      this.checkRowsCount(count);
      cy.wrap(count);
    });
  },

  checkByJobProfileName(jobProfileName) {
    waitUIToBeFiltered();
    return cy.get('#list-data-import').then((element) => {
      // only 100 records shows on every page
      const resultCount =
        element.attr('data-total-count') > 99 ? 99 : element.attr('data-total-count');

      // verify every string in result table
      for (let i = 0; i < resultCount; i++) {
        cy.expect(MultiColumnListCell({ content: jobProfileName, row: i }).exists());
      }
    });
  },

  checkByInventorySingleRecord(filter) {
    // need to wait until selected data will be displayed
    cy.wait(2000);
    return cy.get('#list-data-import').then((element) => {
      // only 100 records shows on every page
      const resultCount =
        element.attr('data-total-count') > 99 ? 99 : element.attr('data-total-count');
      // verify every string in result table
      for (let i = 0; i < resultCount; i++) {
        if (filter === 'Yes') {
          cy.expect(
            MultiColumnListCell({
              content: or(
                'Inventory Single Record - Default Create Instance',
                'Inventory Single Record - Default Update Instance',
              ),
              row: i,
            }).exists(),
          );
        } else {
          cy.expect(
            MultiColumnListCell({
              content: or(
                'Inventory Single Record - Default Create Instance',
                'Inventory Single Record - Default Update Instance',
              ),
              row: i,
            }).absent(),
          );
        }
      }
    });
  },

  checkByErrorsInImportAndUser(status, userName) {
    waitUIToBeFiltered();
    checkByErrorsInImport(status);
    checkByUserName(userName);
  },

  checkByDateAndJobProfile({ from, end }, profileId) {
    const queryString = `completedAfter=${from}&completedBefore=${end}&limit=100&profileIdAny=${profileId}&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR&statusAny=CANCELLED`;
    return this.getNumberOfMatchedJobs(queryString).then((count) => {
      // ensure MultiColumnList is filtered by Date
      this.checkRowsCount(count);
      cy.wrap(count);
    });
  },

  getNumberOfMatchedJobs(queryString) {
    return cy
      .request({
        method: 'GET',
        url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobExecutions?${queryString}`,
        headers: {
          'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
          'x-okapi-token': Cypress.env('token'),
        },
      })
      .then(({ body }) => {
        return body.jobExecutions.length;
      });
  },

  // This method is used to get the first job profile from job logs list
  // it is used to filter by "job Profile"
  getSingleJobProfile() {
    const queryString = UrlParams.getSingleJobProfileQueryString();
    return cy
      .request({
        method: 'GET',
        url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobExecutions?${queryString}`,
        headers: {
          'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
          'x-okapi-token': Cypress.env('token'),
        },
      })
      .then(({ body }) => {
        return body.jobExecutions[0];
      });
  },

  viewAllIsOpened: () => {
    cy.expect(Pane('Search & filter').exists());
    cy.expect(
      Pane('Logs')
        .find(MultiColumnList({ id: 'list-data-import' }))
        .exists(),
    );
  },

  selectAllLogs: () => {
    cy.do(dataImportList.find(Checkbox({ name: 'selected-all', checked: false })).click());
  },

  checkIsLogsSelected: (elemCount) => {
    for (let i = 0; i < elemCount; i++) {
      cy.expect(getCheckboxByRow(i).is({ disabled: false, checked: true }));
    }
  },

  unmarcCheckbox: (index) => {
    cy.do(
      dataImportList
        .find(MultiColumnListCell({ row: 0, columnIndex: index }))
        .find(Checkbox({ checked: true }))
        .click(),
    );
  },

  checkmarkAllLogsIsRemoved: () => {
    cy.do(dataImportList.find(Checkbox({ name: 'selected-all', checked: false })).exists());
  },

  deleteLog: () => {
    cy.do(Pane({ id: 'pane-results' }).find(Button('Actions')).click());
    cy.do(Button('Delete selected logs').click());
  },

  modalIsAbsent: () => {
    cy.expect(Modal('Delete data import logs?').absent());
  },

  openInventorysingleRecordImportsAccordion: () => {
    cy.do(Accordion({ id: 'singleRecordImports' }).clickHeader());
  },

  openFileDetails: (fileName) => {
    cy.do(MultiColumnList({ id: 'list-data-import' }).find(Link(fileName)).click());
  },

  verifyCheckboxForMarkingLogsAbsent: () => cy.expect(selectAllCheckbox.absent()),

  verifyQuantityOfLogs: (quantity) => {
    cy.expect(
      Pane({ id: 'pane-results' })
        .find(HTML(including(`${quantity} logs found`)))
        .exists(),
    );
  },
};
