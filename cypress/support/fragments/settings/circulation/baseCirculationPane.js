import { NavListItem, Pane } from '../../../../../interactors';
import SettingsPane from '../settingsPane';

const circulationPane = Pane('Circulation');

export default {
  ...SettingsPane,
  waitLoading(section = 'Circulation') {
    cy.expect(Pane(section).exists());
  },

  goToSettingsCirculation(option) {
    cy.do(circulationPane.find(NavListItem(option)).click());
  },
};
