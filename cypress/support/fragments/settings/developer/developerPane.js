import { NavListItem, Section } from '../../../../../interactors';

const developerSection = Section({ id: 'app-settings-nav-pane' });

export default {
  waitLoading() {
    cy.expect(developerSection.exists());
  },

  selectOption(optionName) {
    cy.do(developerSection.find(NavListItem(optionName)).click());
  },
};
