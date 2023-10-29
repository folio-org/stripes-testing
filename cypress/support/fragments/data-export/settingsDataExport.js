import {
  Pane,
  NavListItem
} from '../../../../interactors';

const dataExportPane = Pane('Data export');

export default {
  goToSettingsDataExport() {
    cy.do(NavListItem('Data export').click());
    cy.expect([
      dataExportPane.exists(),
      dataExportPane.find(NavListItem('Job profiles')).exists(),
      dataExportPane.find(NavListItem('Field mapping profiles')).exists(),
    ]);
  },
  verifyPageTitle(title) {
    cy.title().should('eq', title);
  },
};
