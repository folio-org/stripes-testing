export default {

  goToDataImport:() => {
    cy.visit('/data-import');
  },

  uploadFile() {
    // TODO using fabrica
    cy.get('[type="file"]').attachFile('oneMarcBib.mrc');
  }
};
