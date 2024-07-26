import { PaneHeader } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(PaneHeader('Software versions').exists());
  },

  checkErrorNotDisplayed() {
    cy.get('[role="alert"]').should('not.be.visible');
  },
};
