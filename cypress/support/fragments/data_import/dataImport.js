
export default class SettingsDataImport {
  static goToDataImport() {
    cy.visit('/data-import');
  }

  static uploadFile() {
    // TODO using fabrica
    cy.get('[type="file"]').attachFile('FAT-742.mrc');
  }
}
