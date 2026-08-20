describe.skip('Specifications sync', () => {
  it(
    'Sync marc bibliographic and marc authority records fields (smoke tests)',
    { tags: ['smokeSkip', 'promin'] },
    () => {
      cy.getAdminToken();
      cy.getSpecificationIds().then((specifications) => {
        cy.syncSpecifications(specifications[0].id);
        cy.syncSpecifications(specifications[1].id);
      });
    },
  );

  it(
    'Sync marc bibliographic and marc authority records fields (criticalPath tests)',
    { tags: ['criticalPathSkip', 'promin'] },
    () => {
      cy.getAdminToken();
      cy.getSpecificationIds().then((specifications) => {
        cy.syncSpecifications(specifications[0].id);
        cy.syncSpecifications(specifications[1].id);
      });
    },
  );

  it(
    'Sync marc bibliographic and marc authority records fields (extendedPath tests)',
    { tags: ['extendedPathSkip', 'promin'] },
    () => {
      cy.getAdminToken();
      cy.getSpecificationIds().then((specifications) => {
        cy.syncSpecifications(specifications[0].id);
        cy.syncSpecifications(specifications[1].id);
      });
    },
  );
});
