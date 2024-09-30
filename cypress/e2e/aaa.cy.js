describe.skip('Specifications sync', () => {
  it(
    'Sync marc bibliographic and marc authority records fields (smoke tests)',
    { tags: ['smoke', 'spitfire'] },
    () => {
      cy.getAdminToken();
      cy.getSpecificatoinIds().then((specifications) => {
        cy.syncSpecifications(specifications[0].id);
        cy.syncSpecifications(specifications[1].id);
      });
    },
  );

  it(
    'Sync marc bibliographic and marc authority records fields (criticalPath tests)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      cy.getAdminToken();
      cy.getSpecificatoinIds().then((specifications) => {
        cy.syncSpecifications(specifications[0].id);
        cy.syncSpecifications(specifications[1].id);
      });
    },
  );

  it(
    'Sync marc bibliographic and marc authority records fields (extendedPath tests)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      cy.getAdminToken();
      cy.getSpecificatoinIds().then((specifications) => {
        cy.syncSpecifications(specifications[0].id);
        cy.syncSpecifications(specifications[1].id);
      });
    },
  );
});
