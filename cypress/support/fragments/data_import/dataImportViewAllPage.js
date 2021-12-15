import { Button, MultiColumnList, Select, TextField } from '../../../../interactors';

export default {
  gotoViewAllPage() {
    cy.do(Button('View all').click());
  },

  selectOption(option) {
    return cy.do(Select({ id: 'input-job-logs-search-qindex' }).choose(option));
  },

  searchWithTerm(term) {
    return cy.do([
      TextField('Search ').fillIn(term),
      Button('Search').click(),
    ]);
  },

  checkRowsCount(rowCount) {
    return cy.expect(MultiColumnList({ id: 'list-data-import' }).has({ rowCount }));
  },

  getJobLogs(searchParams) {
    return cy
      .okapiRequest({
        path: 'metadata-provider/jobExecutions',
        searchParams,
      })
      .then(({ body }) => {
        Cypress.env('viewAllJobLogs', body.jobExecutions);
      });
  }
};
