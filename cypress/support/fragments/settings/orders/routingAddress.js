import { Section } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Section({ id: 'central-ordering' }).exists());
  },

};
