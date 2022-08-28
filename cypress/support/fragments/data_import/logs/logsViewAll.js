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
  Modal
} from '../../../../../interactors';
import UrlParams from '../url-params';
import InteractorsTools from '../../../utils/interactorsTools';

const singleRecordImportsAccordion = Accordion('Inventory single record imports');

function getCheckboxByRow(row) {
  return MultiColumnList().find(MultiColumnListCell({ 'row': row, 'columnIndex': 0 })).find(Checkbox());
}

const verifyMessageOfDeteted = (quantity) => {
  InteractorsTools.checkCalloutMessage(`${quantity} data import logs have been successfully deleted.`);
  InteractorsTools.closeCalloutMessage();
};

export default {
  verifyMessageOfDeteted,

  openViewAll() {
    cy.do([
      Button('Actions').click(),
      Button('View all logs').click()
    ]);
  },

  selectOption(option) {
    return cy.do([Select({ id: 'input-job-logs-search-qindex' }).choose(option)]);
  },

  searchWithTerm(term) {
    cy.get('#input-job-logs-search').clear().type(term);
    cy.do(Button('Search').click());
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
    this.getNumberOfMatchedJobs(queryString).then(count => {
      this.checkRowsCount(count);
    });
  },

  options: ['Keyword (ID, File name)', 'ID', 'File name'],

  errorsInImportStatuses: ['No', 'Yes'],

  singleRecordImportsStatuses: ['No', 'Yes'],

  resetAllFilters() {
    cy.do(Button('Reset all').click());

    // After resetting all filters, we need to sort MultiColumnList
    // Otherwise, server cannot parse request params and returns error with 422 status
    // In this case, sort by completed date in ascending order
    cy.do(MultiColumnListHeader('Ended running').click());
  },

  filterJobsByErrors(filter) {
    if (filter === 'Yes') {
      cy.do(Accordion('Errors in import')
        .find(Checkbox({ id: 'clickable-filter-statusAny-error' })).click());
    } else {
      cy.do(Accordion('Errors in import')
        .find(Checkbox({ id: 'clickable-filter-statusAny-committed' })).click());
    }
  },

  filterJobsByDate({ from, end }) {
    cy.do([
      Accordion({ id: 'completedDate' }).clickHeader(),
      TextField({ label: 'From' }).fillIn(from),
      TextField({ label: 'To' }).fillIn(end),
      Button('Apply').click()
    ]);
  },

  filterJobsByJobProfile(jobProfile) {
    cy.do([
      Accordion({ id: 'profileIdAny' }).clickHeader(),
      Accordion({ id: 'profileIdAny' }).find(Selection({ singleValue: 'Choose job profile' })).open(),
      SelectionList().select(jobProfile)
    ]);
  },

  filterJobsByUser(user) {
    cy.do([
      Accordion({ id: 'userId' }).clickHeader(),
      Selection({ singleValue: 'Choose user' }).open(),
      SelectionList().select(user)
    ]);
  },

  filterJobsByInventorySingleRecordImports(filter) {
    if (filter === 'Yes') {
      cy.do(singleRecordImportsAccordion
        .find(Checkbox({ id: 'clickable-filter-singleRecordImports-yes' })).click());
    } else {
      cy.do(singleRecordImportsAccordion
        .find(Checkbox({ id: 'clickable-filter-singleRecordImports-no' })).click());
    }
  },

  // TODO: redesign to interactors
  getMultiColumnListCellsValues(cell) {
    const cells = [];

    // get MultiColumnList rows and loop over
    return cy.get('[data-row-index]').each($row => {
      // from each row, choose specific cell
      cy.get(`[class*="mclCell-"]:nth-child(${cell})`, { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then(cellValue => {
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
    ENDED_RUNNING: { columnIndex: 6 },
    RUN_BY: { columnIndex: 7 }
  },

  waitUIToBeFiltered() {
    // Need some waiting when jobs list is long, UI takes longer to be filtered
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1800);
  },

  checkByReverseChronologicalOrder() {
    this.getMultiColumnListCellsValues(this.visibleColumns.ENDED_RUNNING.columnIndex).then(cells => {
      // convert each cell value to Date object
      const dates = cells.map(cell => new Date(cell));

      // create new array from the dates and sort this array in descending order
      const sortedDates = [...dates].sort((a, b) => b - a);

      // if job logs are sorted by default in reverse chronological order
      // the dates and sortedDates should be equal
      expect(dates).to.deep.equal(sortedDates);
    });
  },

  checkByErrorsInImport({ filter }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(this.visibleColumns.STATUS.columnIndex).then(statuses => {
      // if filter is 'Yes', then check for error otherwise, completed status
      const expectedStatuses = filter === 'Yes' ? ['Failed', 'Completed with errors'] : ['Completed'];
      // each status in the statuses array should be in the expectedStatuses array
      const isFilteredByErrorStatus = statuses.every(jobStatus => expectedStatuses.includes(jobStatus));

      // eslint-disable-next-line no-unused-expressions
      expect(isFilteredByErrorStatus).to.be.true;
    });
  },

  checkByDate({ from, end }) {
    const queryString = UrlParams.getDateQueryString({ from, end });
    return this.getNumberOfMatchedJobs(queryString).then(count => {
      // ensure MultiColumnList is filtered by Date
      this.checkRowsCount(count);
      cy.wrap(count);
    });
  },

  checkByJobProfileName({ jobProfileName }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(this.visibleColumns.JOB_PROFILE.columnIndex).then(jobProfiles => {
      // each profile name in the jobProfiles array should be equal to jobProfileName
      const isFilteredByProfile = jobProfiles.every(name => name === jobProfileName);

      // eslint-disable-next-line no-unused-expressions
      expect(isFilteredByProfile).to.be.true;
    });
  },

  checkByUserName({ userName }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(this.visibleColumns.RUN_BY.columnIndex).then(userNames => {
      // each name in the userNames array should be equal to the userName
      const isFilteredByUser = userNames.every(name => name === userName);

      // eslint-disable-next-line no-unused-expressions
      expect(isFilteredByUser).to.be.true;
    });
  },

  checkByInventorySingleRecord({ filter }) {
    this.waitUIToBeFiltered();
    cy.get('body').then($body => {
      if ($body.find('#list-data-import').length < 1) {
        cy.expect(MultiColumnList().absent());
      } else {
        this.getMultiColumnListCellsValues(this.visibleColumns.JOB_PROFILE.columnIndex).then(profiles => {
          const inventorySingleRecordProfiles = [
            'Inventory Single Record - Default Create Instance',
            'Inventory Single Record - Default Update Instance'
          ];

          if (filter === 'Yes') {
            const isInventorySingleRecord = profiles.every(profile => inventorySingleRecordProfiles.includes(profile));
            // eslint-disable-next-line no-unused-expressions
            expect(isInventorySingleRecord).to.be.true;
          } else {
            const isNotInventorySingleRecord = profiles.every(profile => !inventorySingleRecordProfiles.includes(profile));
            // eslint-disable-next-line no-unused-expressions
            expect(isNotInventorySingleRecord).to.be.true;
          }
        });
      }
    });
  },

  checkByErrorsInImportAndUser({ filter, userName }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(this.visibleColumns.STATUS.columnIndex).then(statuses => {
      this.getMultiColumnListCellsValues(this.visibleColumns.RUN_BY.columnIndex).then(names => {
        const expectedStatuses = filter === 'Yes' ? ['Failed', 'Completed with errors'] : ['Completed'];
        const isFilteredByErrorStatus = statuses.every(jobStatus => expectedStatuses.includes(jobStatus));
        const isFilteredByUser = names.every(name => name === userName);

        // eslint-disable-next-line no-unused-expressions
        expect(isFilteredByErrorStatus).to.be.true;
        // eslint-disable-next-line no-unused-expressions
        expect(isFilteredByUser).to.be.true;
      });
    });
  },

  getNumberOfMatchedJobs(queryString) {
    return cy.request({
      method: 'GET',
      url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobExecutions?${queryString}`,
      headers: {
        'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
        'x-okapi-token': Cypress.env('token'),
      },
    }).then(({ body }) => {
      return body.jobExecutions.length;
    });
  },

  // This method is used to get the first job profile from job logs list
  // it is used to filter by "job Profile"
  getSingleJobProfile() {
    const queryString = 'limit=1000&order=asc';
    return cy.request({
      method: 'GET',
      url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobExecutions?${queryString}`,
      headers: {
        'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
        'x-okapi-token': Cypress.env('token'),
      },
    }).then(({ body }) => {
      return body.jobExecutions[0];
    });
  },

  viewAllIsOpened:() => {
    cy.expect(Pane('Search & filter').exists());
    cy.expect(Pane('Logs').find(MultiColumnList({ id: 'list-data-import' })).exists());
  },

  selectAllLogs:() => {
    cy.do(MultiColumnList({ id:'list-data-import' }).find(Checkbox({ name:'selected-all', checked: false })).click());
  },

  checkIsLogsSelected:(elemCount) => {
    for (let i = 0; i < elemCount; i++) {
      cy.expect(getCheckboxByRow(i).is({ disabled: false, checked: true }));
    }
  },

  unmarcCheckbox:(index) => {
    cy.do(MultiColumnList({ id:'list-data-import' })
      .find(MultiColumnListCell({ row: 0, columnIndex: index }))
      .find(Checkbox({ checked: true })).click());
  },

  checkmarkAllLogsIsRemoved:() => {
    cy.do(MultiColumnList({ id:'list-data-import' }).find(Checkbox({ name:'selected-all', checked: false })).exists());
  },

  deleteLog:() => {
    cy.do(Pane({ id:'pane-results' }).find(Button('Actions')).click());
    cy.do(Button('Delete selected logs').click());
  },

  modalIsAbsent:() => { cy.expect(Modal('Delete data import logs?').absent()); }
};
