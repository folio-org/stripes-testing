import { Pane, NavListItem } from '../../../../interactors';

const dataImportPane = Pane('Data import');

export default {
  goToSettingsDataImport() {
    cy.do(NavListItem('Data import').click());
    cy.expect([
      dataImportPane.exists(),
      dataImportPane.find(NavListItem('Job profiles')).exists(),
      dataImportPane.find(NavListItem('Match profiles')).exists(),
      dataImportPane.find(NavListItem('Action profiles')).exists(),
      dataImportPane.find(NavListItem('Field mapping profiles')).exists(),
      dataImportPane.find(NavListItem('File extensions')).exists(),
      dataImportPane.find(NavListItem('MARC field protection')).exists(),
    ]);
  },
};
