import SettingsPane from '../settingsPane';
import { Pane } from '../../../../../interactors';

export default {
  ...SettingsPane,
  waitLoading(section = 'Circulation') {
    cy.expect(Pane(section).exists());
  },
};
