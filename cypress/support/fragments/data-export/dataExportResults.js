export default {
  verifyQuickExportResult() {
    cy.get('[data-row-index="row-0"]').then(elem => {
      const expectedFileNameMask = /quick-export-\d{1,3}.mrc/gm;
      const expectedJobProfile = 'Default instances export job profile';

      expect(elem.text()).to.match(expectedFileNameMask);
      expect(elem.text()).to.have.string(expectedJobProfile);
    });
  }
};
