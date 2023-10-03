import { Pane } from '../../../../../../interactors';
import SettingsPane, { rootPane } from '../../settingsPane';

export default {
  ...SettingsPane,
  rootPane,
  waitLoading() {
    cy.expect(Pane('Addresses').exists());
  },
};
