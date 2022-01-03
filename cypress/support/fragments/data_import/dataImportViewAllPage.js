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
    if (rowCount === 0) return cy.get('#list-data-import').should('not.exist');
    return cy.expect(MultiColumnList({ id: 'list-data-import' }).has({ rowCount }));
  },

  options: ['Keyword (ID, File name)', 'ID', 'File name'],

  errorsInImportStatuses: ['No', 'Yes'],

  singleRecordImportsStatuses: ['No', 'Yes'],

  checkForReverseChronologicalOrder() {
    const dates = [];

    // get MultiColumnList rows and loop over
    cy.get('[data-row-index]').each($row => {
      // from each row, choose Date cell
      cy.get('[class^="mclCell"]:nth-child(5)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then($date => {
          // convert its content to Date object
          // add resulting date object to the dates array
          dates.push(new Date($date));
        });
    })
      .then(() => {
        // sort the dates array in descending order
        const sortedDates = dates.slice().sort((a, b) => b - a);

        // if job logs are sorted by default in reverse chronological order
        // the dates and sortedDates should be equal
        expect(dates).to.deep.equal(sortedDates);

        console.log({ dates, sortedDates });
      });
  },

  checkForImportErrorStatuses(status) {
    const errorStatuses = ['Failed', 'Completed with errors'];
    const completedStatuses = ['Completed'];
    const statuses = [];

    // get MultiColumnList rows and loop over
    cy.get('[data-row-index]').each($row => {
      // from each row, choose Status cell
      cy.get('[class^="mclCell"]:nth-child(2)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then(jobStatus => {
          // add status text to the statuses array
          statuses.push(jobStatus);
        });
    })
      .then(() => {
        // if status is 'Yes', then check for error statuses otherwise, completed statuses
        const expectedStatuses = status === 'Yes' ? errorStatuses : completedStatuses;

        // eslint-disable-next-line array-callback-return
        statuses.forEach(jobStatus => {
          expect(expectedStatuses).to.include(jobStatus);
        });
      });
  },

  resetAllFilters() {
    cy.do(Button('Reset all').click());

    // After resetting all filters, we need to sort MultiColumnList
    // Otherwise, server cannot parse request params and returns error with 422 status
    // In this case, sort by completed date in ascending order
    cy.do(MultiColumnListHeader('Ended running').click());
  },

  getErrorsQuery({ filter }) {
    if (filter === 'Yes') {
      return 'status==ERROR';
    }
    return 'status==COMMITTED';
  },

  getDateQuery({ from, end }) {
    return `((status any "COMMITTED ERROR") AND completedDate>="${from}" and (status any "COMMITTED ERROR") AND completedDate<="${end}")`;
  },

  getJobProfileQuery({ jobProfileId }) {
    return `(status any "COMMITTED ERROR") AND jobProfileInfo.id=="${jobProfileId}"`;
  },

  getUserQuery({ userId }) {
    return `((status any "COMMITTED ERROR") AND userId=="${userId}") sortby completedDate/sort.descending`;
  },

  getMixedQuery({ status, userId }) {
    return `(status=="${status === 'Yes' ? 'ERROR' : 'COMMITTED'}" and (status any "COMMITTED ERROR") AND userId=="${userId}") sortby completedDate/sort.descending`;
  },

  getSingleRecordImportsQuery({ isSingleRecord }) {
    if (isSingleRecord === 'Yes') {
      return '(jobProfileInfo="\\“id\\“==d0ebb7b0-2f0f-11eb-adc1-0242ac120002") ' +
        'OR (jobProfileInfo="\\“id\\“==91f9b8d6-d80e-4727-9783-73fb53e3c786") ' +
        'sortby completedDate';
    }

    return '(jobProfileInfo="\\“id\\“==" ' +
      'NOT jobProfileInfo="\\“id\\“=="d0ebb7b0-2f0f-11eb-adc1-0242ac120002") ' +
      'AND (jobProfileInfo="\\“id\\“==" ' +
      'NOT jobProfileInfo="\\“id\\“=="91f9b8d6-d80e-4727-9783-73fb53e3c786"") ' +
      'sortby completedDate/sort.descending';
  },

  filterJobsByErrors(filter) {
    if (filter === 'Yes') {
      cy.do(CheckBox({ id: 'clickable-filter-status-error' }).click());
    } else if (filter === 'No') {
      cy.do(CheckBox({ id: 'clickable-filter-status-committed' }).click());
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
      Accordion({ id: 'jobProfileInfo' }).clickHeader(),
      Selection({ value: 'Choose job profile' }).open(),
      SelectionList().select(jobProfile)
    ]);
  },

  filterJobsByUser(user) {
    cy.do([
      Accordion({ id: 'userId' }).clickHeader(),
      Selection({ value: 'Choose user' }).open(),
      SelectionList().select(user)
    ]);
  },

  filterJobsBySingleRecordImports(filter) {
    if (filter === 'Yes') {
      cy.do(CheckBox({ id: 'clickable-filter-singleRecordImports-yes' }).click());
    } else if (filter === 'No') {
      cy.do(CheckBox({ id: 'clickable-filter-singleRecordImports-no' }).click());
    }
  },

  getNumberOfMatchedJobs({ query }) {
    return cy
      .okapiRequest({
        path: 'metadata-provider/jobExecutions',
        searchParams: { limit: 100, query },
      })
      .then(({ body }) => {
        return body.jobExecutions.length;
      });
  },

  // the method is used to get the job profile info from a random job log
  // It is used to filter by "job Profile"
  getSingleJobProfile() {
    const query = '((status any "COMMITTED ERROR")) sortby completedDate/sort.descending';
    return cy
      .okapiRequest({
        path: 'metadata-provider/jobExecutions',
        searchParams: { limit: 1, query },
      })
      .then(({ body }) => {
        return body.jobExecutions[0];
      });
  },
};

