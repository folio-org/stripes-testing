import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Tenants', () => {
    const { user, memberTenant } = parseSanityParameters();

    const testData = {
      tenant: memberTenant.id,
      properties: {
        id: 'id',
        replaces: 'replaces',
        requires: 'requires',
        provides: 'provides',
        optional: 'optional',
        permissionSets: 'permissionSets',
        launchDescriptor: 'launchDescriptor',
        name: 'name',
      },
      providedInterface1Id: 'login',
      providedInterface2Id: 'roles',
      requiredInterfaceId: 'configuration',
    };

    let totalModuleCount = 0;
    const modulesProvidingIds = [];
    const modulesRequiringIds = [];
    let moduleId;

    function getDataFromAppDescriptor(appDescriptor) {
      [...appDescriptor.moduleDescriptors, ...appDescriptor.uiModuleDescriptors].forEach(
        (moduleDescriptor) => {
          if (
            Object.prototype.hasOwnProperty.call(moduleDescriptor, testData.properties.provides) &&
            moduleDescriptor.provides.some(
              (iface) => iface.id === testData.providedInterface1Id ||
                iface.id === testData.providedInterface2Id,
            )
          ) modulesProvidingIds.push(moduleDescriptor.id);
          if (
            Object.prototype.hasOwnProperty.call(moduleDescriptor, testData.properties.requires) &&
            moduleDescriptor.requires.some((iface) => iface.id === testData.requiredInterfaceId)
          ) modulesRequiringIds.push(moduleDescriptor.id);
          if (
            Object.prototype.hasOwnProperty.call(moduleDescriptor, testData.properties.optional) &&
            moduleDescriptor.optional.some((iface) => iface.id === testData.requiredInterfaceId)
          ) modulesRequiringIds.push(moduleDescriptor.id);
        },
      );
    }

    function checkModulesHaveOnlyIds(retrievedModules) {
      expect(
        retrievedModules.every((retrievedModule) => {
          return (
            Object.prototype.hasOwnProperty.call(retrievedModule, testData.properties.id) &&
            Object.keys(retrievedModule).length === 1
          );
        }),
      ).to.eq(true);
    }

    function checkAllModulesHaveIds(retrievedModules) {
      expect(
        retrievedModules.every((retrievedModule) => Object.prototype.hasOwnProperty.call(retrievedModule, testData.properties.id)),
      ).to.eq(true);
    }

    function checkModulesMayHaveAllFields(retrievedModules) {
      checkAllModulesHaveIds(retrievedModules);
      Object.entries(testData.properties).forEach((property, index) => {
        if (index) {
          expect(
            retrievedModules.some((retrievedModule) => Object.prototype.hasOwnProperty.call(retrievedModule, property[0])),
          ).to.eq(true);
        }
      });
    }

    function checkOnlyExpectedModulesFound(expectedModules, retrievedModules) {
      expect(retrievedModules).to.have.lengthOf(expectedModules.length);
      expectedModules.forEach((id) => {
        expect(retrievedModules.filter((module) => module.id === id)).to.have.lengthOf(1);
      });
    }

    function checkSomeModulesHaveMoreThanIds(retrievedModules) {
      checkAllModulesHaveIds(retrievedModules);
      expect(
        retrievedModules.some((retrievedModule) => Object.keys(retrievedModule).length > 1),
      ).to.eq(true);
    }

    it(
      'C553008 Modules for a tenant can be retrieved from /_/proxy/tenants/<tenant>/modules (eureka)',
      { tags: ['dryRun', 'eureka', 'C553008'] },
      () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();

        cy.getApplicationsForTenantApi(testData.tenant, false).then((appsResponse) => {
          expect(appsResponse.status).to.eq(200);
          appsResponse.body.applicationDescriptors.forEach((appDescriptor) => {
            totalModuleCount += appDescriptor.modules.length + appDescriptor.uiModules.length;
            getDataFromAppDescriptor(appDescriptor);
            moduleId = modulesRequiringIds[0];
          });

          cy.getModulesForTenantProxyApi(testData.tenant).then((response) => {
            expect(response.status).to.eq(200);
            const retrievedModules = response.body;
            checkModulesHaveOnlyIds(retrievedModules);
            expect(retrievedModules).to.have.lengthOf(totalModuleCount);
          });

          cy.getModulesForTenantProxyApi(testData.tenant, { full: false }).then((response) => {
            expect(response.status).to.eq(200);
            const retrievedModules = response.body;
            checkModulesHaveOnlyIds(retrievedModules);
            expect(retrievedModules).to.have.lengthOf(totalModuleCount);
          });

          cy.getModulesForTenantProxyApi(testData.tenant, { full: true }).then((response) => {
            expect(response.status).to.eq(200);
            const retrievedModules = response.body;
            checkModulesMayHaveAllFields(retrievedModules);
          });

          cy.getModulesForTenantProxyApi(testData.tenant, { full: false, filter: moduleId }).then(
            (response) => {
              expect(response.status).to.eq(200);
              const retrievedModules = response.body;
              expect(retrievedModules).to.have.lengthOf(1);
              expect(retrievedModules[0].id).to.eq(moduleId);
            },
          );

          cy.getModulesForTenantProxyApi(testData.tenant, {
            full: true,
            provide: `${testData.providedInterface1Id},${testData.providedInterface2Id}`,
          }).then((response) => {
            expect(response.status).to.eq(200);
            const retrievedModules = response.body;
            checkSomeModulesHaveMoreThanIds(retrievedModules);
            checkOnlyExpectedModulesFound(modulesProvidingIds, retrievedModules);
          });

          cy.getModulesForTenantProxyApi(testData.tenant, {
            full: false,
            require: testData.requiredInterfaceId,
          }).then((response) => {
            expect(response.status).to.eq(200);
            const retrievedModules = response.body;
            checkModulesHaveOnlyIds(retrievedModules);
            checkOnlyExpectedModulesFound(modulesRequiringIds, retrievedModules);
          });

          cy.getModulesForTenantProxyApi(testData.tenant, { full: false, preRelease: false }).then(
            (response) => {
              expect(response.status).to.eq(200);
              const retrievedModules = response.body;
              expect(retrievedModules).to.have.length.of.at.most(totalModuleCount);
            },
          );

          cy.getModulesForTenantProxyApi(testData.tenant, { full: false, npmSnapshot: false }).then(
            (response) => {
              expect(response.status).to.eq(200);
              const retrievedModules = response.body;
              expect(retrievedModules).to.have.length.of.at.most(totalModuleCount);
            },
          );
        });
      },
    );
  });
});
