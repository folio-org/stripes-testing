const defaultJobProfile = 'Default instances export job profile';
const quickExportFileNameMask = /quick-export-\d{1,3}.mrc/gm;

export default {
  verifyQuickExportResult() {
    // TODO: need table interactor with rows (mclRowContainer)
    cy.get('[data-row-index="row-0"]').then(elem => {
      expect(elem.text()).to.match(quickExportFileNameMask);
      expect(elem.text()).to.have.string(defaultJobProfile);
    });
  }
};
