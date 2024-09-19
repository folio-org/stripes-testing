import { Pane } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Pane({ id: 'order-settings-order-templates-list' }).exists());
  },
};
