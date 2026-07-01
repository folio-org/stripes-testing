describe('Eureka', () => {
  describe('Applications', () => {
    const expectedWidgetNames = ['ERM Agreements', 'ERM Licenses'];

    it(
      'C1332443 Validation/FAR do not allow an interface to be both provided and optional in the same module descriptor (eureka)',
      { tags: ['criticalPath', 'eureka', 'C1332443'] },
      () => {
        cy.getAdminToken();
        cy.getGlobalWidgetDefinitions().then(({ status, body }) => {
          expect(status).to.eq(200);
          expectedWidgetNames.forEach((name) => {
            const targetDef = body.find((def) => def.name === name);
            expect(targetDef, `Widget definition for "${name}" should exist`).to.not.equal(
              undefined,
            );
            expect(
              targetDef,
              `Widget definition for "${name}" should have correct name`,
            ).to.have.property('name', name);
          });
        });
      },
    );
  });
});
