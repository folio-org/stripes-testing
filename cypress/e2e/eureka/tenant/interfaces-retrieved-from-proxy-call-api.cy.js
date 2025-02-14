describe('Eureka', () => {
  describe('Tenants', () => {
    const testData = {
      tenant: Cypress.env('OKAPI_TENANT'),
      interfaceTypes: ['system', 'internal', 'multiple'],
      properties: {
        id: 'id',
        version: 'version',
        type: 'interfaceType',
        handlers: 'handlers',
        provides: 'provides',
      },
    };

    const existingInterfaces = [];
    const interfacesByType = [];

    it(
      'C546774 Interfaces for a tenant can be retrieved from /_/proxy/tenants/<tenant>/interfaces (eureka)',
      { tags: ['criticalPath', 'eureka', 'shiftLeft', 'C546774'] },
      () => {
        cy.getAdminToken();
        cy.getApplicationsForTenantApi(testData.tenant, false).then((appsResponse) => {
          expect(appsResponse.status).to.eq(200);
          appsResponse.body.applicationDescriptors.forEach((appDescriptor) => {
            appDescriptor.moduleDescriptors.forEach((moduleDescriptor) => {
              if (
                Object.prototype.hasOwnProperty.call(moduleDescriptor, testData.properties.provides)
              ) existingInterfaces.push(...moduleDescriptor.provides);
            });
          });
          testData.interfaceTypes.forEach((interfaceType) => {
            interfacesByType.push(
              existingInterfaces.filter((iface) => {
                return (
                  Object.prototype.hasOwnProperty.call(iface, testData.properties.type) &&
                  iface.interfaceType === interfaceType
                );
              }),
            );
          });

          testData.interfaceTypes.forEach((interfaceType, index) => {
            cy.getInterfacesForTenantProxyApi(testData.tenant, {
              full: true,
              type: interfaceType,
            }).then((response) => {
              expect(response.status).to.eq(200);
              const retrievedInterfaces = response.body;
              if (interfacesByType[index].length === 0) {
                expect(retrievedInterfaces).to.have.lengthOf(0);
              } else {
                expect(
                  retrievedInterfaces.every((retrievedInterface) => {
                    return (
                      Object.prototype.hasOwnProperty.call(
                        retrievedInterface,
                        testData.properties.id,
                      ) &&
                      retrievedInterface.interfaceType === interfaceType &&
                      Object.prototype.hasOwnProperty.call(
                        retrievedInterface,
                        testData.properties.version,
                      )
                    );
                  }),
                ).to.eq(true);
                expect(
                  retrievedInterfaces.some((retrievedInterface) => {
                    return Object.prototype.hasOwnProperty.call(
                      retrievedInterface,
                      testData.properties.handlers,
                    );
                  }),
                ).to.eq(true);
                expect(retrievedInterfaces).to.have.lengthOf(interfacesByType[index].length);
              }
            });
          });

          cy.getInterfacesForTenantProxyApi(testData.tenant, {
            full: true,
          }).then((response) => {
            expect(response.status).to.eq(200);
            const retrievedInterfaces = response.body;
            expect(
              retrievedInterfaces.every((retrievedInterface) => {
                return (
                  Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.id,
                  ) &&
                  Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.version,
                  )
                );
              }),
            ).to.eq(true);
            expect(
              retrievedInterfaces.some((retrievedInterface) => {
                return (
                  Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.type,
                  ) ||
                  Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.handlers,
                  )
                );
              }),
            ).to.eq(true);
            expect(retrievedInterfaces).to.have.lengthOf(existingInterfaces.length);
          });

          testData.interfaceTypes.forEach((interfaceType, index) => {
            cy.getInterfacesForTenantProxyApi(testData.tenant, {
              full: false,
              type: interfaceType,
            }).then((response) => {
              expect(response.status).to.eq(200);
              const retrievedInterfaces = response.body;
              if (interfacesByType[index].length === 0) {
                expect(retrievedInterfaces).to.have.lengthOf(0);
              } else {
                expect(
                  retrievedInterfaces.every((retrievedInterface) => {
                    return (
                      Object.prototype.hasOwnProperty.call(
                        retrievedInterface,
                        testData.properties.id,
                      ) &&
                      Object.prototype.hasOwnProperty.call(
                        retrievedInterface,
                        testData.properties.version,
                      ) &&
                      !Object.prototype.hasOwnProperty.call(
                        retrievedInterface,
                        testData.properties.type,
                      ) &&
                      !Object.prototype.hasOwnProperty.call(
                        retrievedInterface,
                        testData.properties.handlers,
                      )
                    );
                  }),
                ).to.eq(true);
                expect(retrievedInterfaces).to.have.lengthOf(interfacesByType[index].length);
              }
            });
          });

          cy.getInterfacesForTenantProxyApi(testData.tenant, {
            full: false,
          }).then((response) => {
            expect(response.status).to.eq(200);
            const retrievedInterfaces = response.body;
            expect(
              retrievedInterfaces.every((retrievedInterface) => {
                return (
                  Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.id,
                  ) &&
                  Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.version,
                  ) &&
                  !Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.type,
                  ) &&
                  !Object.prototype.hasOwnProperty.call(
                    retrievedInterface,
                    testData.properties.handlers,
                  )
                );
              }),
            ).to.eq(true);
            expect(retrievedInterfaces).to.have.lengthOf(existingInterfaces.length);
          });
        });
      },
    );
  });
});
