import { Pane, NavListItem } from '../../../../../interactors';
import PatronGroups from './patronGroups';

const usersPane = Pane('Users');

export const SETTINGS_TABS = {
  PATRON_GROUPS: 'Patron groups',
};

export default {
  selectSettingsTab(settingsTab) {
    cy.do(NavListItem(settingsTab).click());

    switch (settingsTab) {
      case SETTINGS_TABS.PATRON_GROUPS:
        return PatronGroups;
      default:
        return this;
    }
  },
  goToSettingsCirculation() {
    cy.do(NavListItem('Users').click());
    cy.expect(usersPane.exists());
    Object.values(SETTINGS_TABS).forEach((settingsTab) => {
      cy.expect(usersPane.find(NavListItem(settingsTab)).exists());
    });
  },
};
