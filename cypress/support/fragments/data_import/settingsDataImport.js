
export default class SettingsDataImport {
  static goToMappingProfile() {
    cy.visit('/settings/data-import/mapping-profiles');
  }

  static goToActionProfile() {
    cy.visit('/settings/data-import/action-profiles');
  }

  static goToJobProfile() {
    cy.visit('/settings/data-import/job-profiles');
  }
}
