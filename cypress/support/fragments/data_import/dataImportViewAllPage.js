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
    return cy.expect(MultiColumnList({ id: 'list-data-import' }).has({ rowCount }));
  },

  options: ['Keyword (ID, File name)', 'ID', 'File name'],
};
