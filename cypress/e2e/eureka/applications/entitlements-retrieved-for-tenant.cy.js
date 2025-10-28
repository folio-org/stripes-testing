describe('Eureka', () => {
  describe('Applications', () => {
    const testData = {
      currentTenantName: Cypress.env('OKAPI_TENANT'),
    };

    before('Get tenant data', () => {
      cy.getAdminToken();
      cy.getTenantsApi().then(({ body }) => {
        testData.existingTenantIds = body.tenants.map((tenant) => tenant.id);
        testData.currentTenantId = body.tenants.find(
          (tenant) => tenant.name === testData.currentTenantName,
        ).id;
      });
      cy.getApplicationsForTenantApi(testData.currentTenantName, true).then((appIds) => {
        testData.currentTenantAppIds = appIds;
      });
    });

    it(
      'C651518 [MGRENTITLE-101] GET /entitlements have ability to retrieve tenant entitlements by tenant name via additional "tenant" query parameter (eureka)',
      { tags: ['criticalPath', 'eureka', 'C651518'] },
      () => {
        cy.getEntitlementsApi({
          includeModules: true,
          limit: 100,
          tenant: testData.currentTenantName,
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          body.entitlements.forEach((entitlement) => {
            expect(testData.currentTenantAppIds).to.include(entitlement.applicationId);
            expect(entitlement.tenantId).to.eq(testData.currentTenantId);
            expect(Array.isArray(entitlement.modules)).to.eq(true);
          });
          expect(body.entitlements.some((entitlement) => entitlement.modules.length)).to.eq(true);
          expect([
            ...new Set(body.entitlements.map((entitlement) => entitlement.applicationId)),
          ]).to.have.lengthOf(testData.currentTenantAppIds.length);
        });

        cy.getEntitlementsApi({
          includeModules: false,
          limit: 100,
          tenant: testData.currentTenantName,
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          body.entitlements.forEach((entitlement) => {
            expect(testData.currentTenantAppIds).to.include(entitlement.applicationId);
            expect(entitlement.tenantId).to.eq(testData.currentTenantId);
            expect(entitlement.modules).to.have.lengthOf(0);
          });
          expect([
            ...new Set(body.entitlements.map((entitlement) => entitlement.applicationId)),
          ]).to.have.lengthOf(testData.currentTenantAppIds.length);
        });

        cy.getEntitlementsApi({
          includeModules: true,
          limit: 1,
          tenant: testData.currentTenantName,
        }).then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(body.entitlements).to.have.lengthOf(1);
          expect(testData.currentTenantAppIds).to.include(body.entitlements[0].applicationId);
          expect(body.entitlements[0].tenantId).to.eq(testData.currentTenantId);
          expect(Array.isArray(body.entitlements[0].modules)).to.be.eq(true);
        });

        cy.getEntitlementsApi({ includeModules: true, limit: 500 }).then(({ status, body }) => {
          expect(status).to.eq(200);
          body.entitlements.forEach((entitlement) => {
            expect(entitlement).to.have.property('applicationId');
            expect(testData.existingTenantIds).to.include(entitlement.tenantId);
            expect(Array.isArray(entitlement.modules)).to.be.eq(true);
          });
          expect(body.entitlements.some((entitlement) => entitlement.modules.length)).to.eq(true);
          expect([
            ...new Set(body.entitlements.map((entitlement) => entitlement.tenantId)),
          ]).to.have.length.of.at.least(2);
        });

        cy.okapiRequest({
          path: `entitlements/${testData.currentTenantId}`,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
        }).then(({ status, body }) => {
          expect(status).to.eq(404);
          expect(body.message).to.include('no Route');
        });
      },
    );
  });
});
