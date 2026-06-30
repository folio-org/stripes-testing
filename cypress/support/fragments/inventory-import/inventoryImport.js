import { Link } from '../../../../interactors';

export default {
  waitLoading() {
    cy.get('#input-jobs-search-qindex').should('exist');
  },

  verifyJobsLinkDisplayed() {
    cy.expect(Link('Jobs').exists());
  },

  verifyFailedRecordsLinkDisplayed() {
    cy.expect(Link('Failed records').exists());
  },
};
