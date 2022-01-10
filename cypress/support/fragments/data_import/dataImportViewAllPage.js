import { CheckBox } from '@interactors/html';
import {
  Accordion,
  Button,
  MultiColumnList,
  MultiColumnListHeader,
  Select,
  Selection,
  SelectionList,
  TextField
} from '../../../../interactors';
import UrlParams from './url-params';

export default {
  gotoViewAllPage() {
    cy.do(Button('View all').click());
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
      MultiColumnList({ id: 'list-data-import' }).is({ visible: false });
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
      return cy.do(CheckBox({ id: 'clickable-filter-statusAny-error' }).click());
    } else {
      return cy.do(CheckBox({ id: 'clickable-filter-statusAny-committed' }).click());
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
      Selection({ value: 'Choose job profile' }).open(),
      SelectionList().select(jobProfile)
    ]);
  },

  filterJobsByUser(user) {
    cy.do([Accordion({ id: 'userId' }).clickHeader(),
      Selection({ value: 'Choose user' }).open(),
      SelectionList().select(user)
    ]);
  },

  filterJobsByInventorySingleRecordImports(filter) {
    if (filter === 'Yes') {
      cy.do(CheckBox({ id: 'clickable-filter-singleRecordImports-yes' }).click());
    } else {
      cy.do(CheckBox({ id: 'clickable-filter-singleRecordImports-no' }).click());
    }
  },

  waitUIToBeFiltered() {
    // FIX: Find better approach for waiting MultiColumnList to be filtered
    // when filtered, ui takes some time to be filtered
    // intercepting and waiting API response is not reliable
    // because, API may return response faster while ui is being filtered

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    return cy.wait(1800);
  },

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

  checkByReverseChronologicalOrder() {
    this.getMultiColumnListCellsValues(5).then(cells => {
      // convert each cell value to Date object
      const dates = cells.map(cell => new Date(cell));

      // create new array from the dates and sort this array in descending order
      const sortedDates = dates.slice(0).sort((a, b) => b - a);

      // if job logs are sorted by default in reverse chronological order
      // the dates and sortedDates should be equal
      expect(dates).to.deep.equal(sortedDates);
    });
  },

  checkByErrorsInImport({ filter }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(2).then(statuses => {
      // if filter is 'Yes', then check for error otherwise, completed status
      const expectedStatuses = filter === 'Yes' ? ['Failed', 'Completed with errors'] : ['Completed'];
      // each status in the statuses array should be in the expectedStatuses array
      const isFilteredByErrorStatus = statuses.every(jobStatus => expectedStatuses.includes(jobStatus));

      // eslint-disable-next-line no-unused-expressions
      expect(isFilteredByErrorStatus).to.be.true;

      this.resetAllFilters();
    });
  },

  checkByDate({ from, end }) {
    const queryString = UrlParams.getDateQueryString({ from, end });
    this.getNumberOfMatchedJobs(queryString).then(count => {
      // ensure MultiColumnList is filtered by Date
      this.checkRowsCount(count);

      this.resetAllFilters();
    });
  },

  checkByJobProfileName({ jobProfileName }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(4).then(jobProfiles => {
      // each profile name in the jobProfiles array should be equal to jobProfileName
      const isFilteredByProfile = jobProfiles.every(name => name === jobProfileName);

      // eslint-disable-next-line no-unused-expressions
      expect(isFilteredByProfile).to.be.true;

      this.resetAllFilters();
    });
  },

  checkByUserName({ userName }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(6).then(userNames => {
      // each name in the userNames array should be equal to the userName
      const isFilteredByUser = userNames.every(name => name === userName);

      // eslint-disable-next-line no-unused-expressions
      expect(isFilteredByUser).to.be.true;

      this.resetAllFilters();
    });
  },

  checkByInventorySingleRecord({ filter }) {
    this.waitUIToBeFiltered();
    cy.get('body').then($body => {
      if ($body.find('#list-data-import').length) {
        this.getMultiColumnListCellsValues(4).then(profiles => {
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
      } else {
        this.checkRowsCount(0);
      }

      this.resetAllFilters();
    });
  },

  checkByErrorsInImportAndUser({ filter, userName }) {
    this.waitUIToBeFiltered();
    this.getMultiColumnListCellsValues(2).then(statuses => {
      this.getMultiColumnListCellsValues(6).then(names => {
        const expectedStatuses = filter === 'Yes' ? ['Failed', 'Completed with errors'] : ['Completed'];
        const isFilteredByErrorStatus = statuses.every(jobStatus => expectedStatuses.includes(jobStatus));
        const isFilteredByUser = names.every(name => name === userName);

        // eslint-disable-next-line no-unused-expressions
        expect(isFilteredByErrorStatus).to.be.true;
        // eslint-disable-next-line no-unused-expressions
        expect(isFilteredByUser).to.be.true;

        this.resetAllFilters();
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
    const queryString = UrlParams.getSingleJobProfileQueryString();
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
};

