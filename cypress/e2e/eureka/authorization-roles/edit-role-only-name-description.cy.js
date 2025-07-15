import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

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
            table: CAPABILITY_TYPES.DATA,
            resource: 'Data-Export Mapping-Profiles Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Notes Settings',
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Roles Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        expectedCounts: {
          capabilities: {
            Data: 2,
            Settings: 1,
          },
        },
        capabIds: [],
      };

      const capabSetsToAssign = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Authorization-Roles Settings Admin',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Capabilities',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Role-Capability-Sets',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
      ];

      const capabsToAssign = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'Settings Enabled',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ];

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
