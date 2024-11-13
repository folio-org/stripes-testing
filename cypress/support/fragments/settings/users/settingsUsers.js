import { NavListItem } from '../../../../../interactors';
import PatronGroups from './patronGroups';

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
};
