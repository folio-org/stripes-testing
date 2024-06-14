import { Section } from '../../../../interactors';

const licensesFilterSection = Section({ id: 'pane-license-filters' });

export default {
  waitLoading: () => {
    cy.expect(licensesFilterSection.exists());
  },
};
