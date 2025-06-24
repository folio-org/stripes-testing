import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C424003_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description C424003 ${getRandomPostfix()}`,
        updatedRoleName: `AT_C424003_UserRole_${getRandomPostfix()} UPD`,
        updatedRoleDescription: `Description C424003 ${getRandomPostfix()} UPD`,
        capabilities: [
          {
            table: 'Data',
            resource: 'Data-Export Mapping-Profiles Collection',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'UI-Notes Settings',
            action: 'Edit',
          },
          {
            table: 'Procedural',
            resource: 'Roles Collection',
            action: 'Execute',
          },
        ],
        expectedCounts: {
          capabilities: {
            Data: 1,
            Settings: 1,
            Procedural: 1,
          },
        },
        capabIds: [],
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName, testData.roleDescription).then(
            (role) => {
              testData.roleId = role.id;
              testData.capabilities.forEach((capability) => {
                capability.type = capability.table;
                cy.getCapabilityIdViaApi(capability).then((capabId) => {
                  testData.capabIds.push(capabId);
                });
              });
            },
          );
        });
      });

      before('Assign capabilities and login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      afterEach('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C424003 Editing existing authorization role (only name/description updated)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C424003'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            testData.capabilities.length.toString(),
          );
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');

          AuthorizationRoles.openForEdit();
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedRoleName,
            testData.updatedRoleDescription,
          );
          // for unclear reasons, the test hangs without this waiter
          cy.wait(2000);
          cy.intercept('PUT', `/roles/${testData.roleId}`).as('roleCall');
          cy.intercept('PUT', /\/roles\/.+\/capabilities/).as('capabilitiesCall');
          cy.intercept('PUT', /\/roles\/.+\/capability-sets/).as('capabilitySetsCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@roleCall').then((call) => {
            expect(call.response.statusCode).to.eq(204);
            expect(call.request.body.name).to.eq(testData.updatedRoleName);
            expect(call.request.body.description).to.eq(testData.updatedRoleDescription);
          });
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName,
            testData.updatedRoleDescription,
          );
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            testData.capabilities.length.toString(),
          );
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.clickOnCapabilitiesAccordion(false);
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          Object.entries(testData.expectedCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });

          cy.get('@capabilitiesCall.all').then((calls) => {
            expect(calls).to.have.length(0);
            cy.get('@capabilitySetsCall.all').then((calls2) => {
              expect(calls2).to.have.length(0);
            });
          });
        },
      );
    });
  });
});
