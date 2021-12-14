
export default class SettingsDataImport {
  static goToDataImport() {
    cy.visit('/data-import');
  }

  static uploadFile() {
    cy.get('[multiple type="file"]').attachFile('FAT-742.mrc');
  }
}
