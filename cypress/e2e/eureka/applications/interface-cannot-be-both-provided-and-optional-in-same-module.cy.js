describe('Eureka', () => {
  describe('Applications', () => {
    const testData = {
      currentTenant: Cypress.env('OKAPI_TENANT'),
      properties: {
        provides: 'provides',
        optional: 'optional',
      },
    };
    const expectedWidgetNames = ['ERM Agreements', 'ERM Licenses'];
    const moduleDescriptors = [];
    const providedOptionalInterfaces = [];

    before(() => {
      cy.getAdminToken();
      cy.getApplicationsForTenantApi(testData.currentTenant, false).then((appsResponse) => {
        appsResponse.body.applicationDescriptors.forEach((appDescriptor) => {
          [...appDescriptor.moduleDescriptors, ...appDescriptor.uiModuleDescriptors].forEach(
            (moduleDescriptor) => {
              moduleDescriptors.push(moduleDescriptor);
            },
          );
        });
      });
    });

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

        cy.then(() => {
          moduleDescriptors.forEach((moduleDescriptor) => {
            let providedInterfaces = [];
            let optionalInterfaces = [];
            if (
              Object.prototype.hasOwnProperty.call(moduleDescriptor, testData.properties.provides)
            ) {
              providedInterfaces = moduleDescriptor.provides;
            }
            if (
              Object.prototype.hasOwnProperty.call(moduleDescriptor, testData.properties.optional)
            ) {
              optionalInterfaces = moduleDescriptor.optional;
            }
            const optionalInterfaceIds = new Set(optionalInterfaces.map((iface) => iface.id));
            const intersection = providedInterfaces.filter((iface) => optionalInterfaceIds.has(iface.id));
            if (intersection.length > 0) {
              providedOptionalInterfaces.push({
                moduleId: moduleDescriptor.id,
                interfaces: intersection,
              });
            }
          });
        })
          .then(() => {
            providedOptionalInterfaces.forEach(({ moduleId, interfaces }) => {
              cy.log(
                `Module "${moduleId}" has interfaces that are both provided and optional: ${interfaces.map((i) => i.id).join(', ')}`,
              );
            });
          })
          .then(() => {
            expect(
              providedOptionalInterfaces,
              'There should be no interfaces that are both provided and optional in the same module descriptor',
            ).to.have.lengthOf(0);
          });
      },
    );
  });
});
