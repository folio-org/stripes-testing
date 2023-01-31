import { Pane } from '../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Pane('Settings').exists());
  },
};
