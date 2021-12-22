import { Section } from '../../../../interactors';

export default {
  waitLoading: (specialTitle) => {
    cy.expect(Section({ id : specialTitle.replaceAll(' ', '-').toLowerCase() }).exists());
  }
};
