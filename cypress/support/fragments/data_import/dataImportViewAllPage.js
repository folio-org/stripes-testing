import { Button, MultiColumnList, Select } from '../../../../interactors';

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

  errorsInImportFilters: ['error', 'committed'],

  singleRecordImports: ['yes', 'no'],

  resetAllFilters() {
    return cy.get('#clickable-reset-all').click();
  },

  getErrorsQuery({ filter }) {
    return `status==${filter.toUpperCase()}`;
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
    return `(status=="${status}" and (status any "COMMITTED ERROR") AND userId=="${userId}") sortby completedDate/sort.descending`;
  },

  getSingleRecordImportsQuery({ isSingleRecord }) {
    if (isSingleRecord === 'yes') {
      return `(jobProfileInfo="\\“id\\“==d0ebb7b0-2f0f-11eb-adc1-0242ac120002")
      OR (jobProfileInfo="\\“id\\“==91f9b8d6-d80e-4727-9783-73fb53e3c786")
      sortby completedDate/sort.descending`;
    }

    return `(jobProfileInfo="\\“id\\“=="
    NOT jobProfileInfo="\\“id\\“=="d0ebb7b0-2f0f-11eb-adc1-0242ac120002")
    AND (jobProfileInfo="\\“id\\“=="
    NOT jobProfileInfo="\\“id\\“=="91f9b8d6-d80e-4727-9783-73fb53e3c786"")
    sortby completedDate/sort.descending`;
  },

  filterJobsByErrors(filter) {
    return cy.get(`[for="clickable-filter-status-${filter}"]`).click();
  },

  filterJobsByDate({ from, end }) {
    cy.get('#accordion-toggle-button-completedDate').click();
    cy.get('[name="startDate"]').type(from);
    cy.get('[name="endDate"]').type(end);
    cy.do(Button('Apply').click());
    cy.get('#accordion-toggle-button-completedDate').click();
  },

  filterJobsByJobProfile(jobProfile) {
    cy.get('#accordion-toggle-button-jobProfileInfo').click();
    cy.contains('Choose job profile').click();
    cy.get('[class*="selectionListRoot"]').contains(jobProfile).click();
    cy.get('#accordion-toggle-button-jobProfileInfo').click();
  },

  filterJobsByUser(user) {
    cy.get('#accordion-toggle-button-userId').click();
    cy.contains('Choose user').click();
    cy.get('[class*="selectionListRoot"]').contains(user).click();
    cy.get('#accordion-toggle-button-userId').click();
  },

  filterJobsBySingleRecordImports(filter) {
    return cy.get(`input[id="clickable-filter-singleRecordImports-${filter}"]`).check();
  },

  getFormattedDate({ date }) {
    const padWithZero = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${padWithZero(date.getMonth() + 1)}-${padWithZero(date.getDate())}`;
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

