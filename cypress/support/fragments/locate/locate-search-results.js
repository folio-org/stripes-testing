import { Heading, including } from '../../../../interactors';

export default {
  verifySearchResults(value) {
    cy.expect(Heading(including(value)).exists());
  },
};
