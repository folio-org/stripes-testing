import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C554636_UserRole_${getRandomPostfix()}`,
        application: 'app-platform-complete',
        capabilitySets: [
          {
            table: 'Data',
            resource: 'Calendar',
            action: 'View',
          },
        ],
        capabilitiesInSets: [
          {
            table: 'Data',
            resource: 'Calendar',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Calendars',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Calendars AllOpenings',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Calendars CalendarId',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Calendars SurroundingOpenings',
            action: 'View',
          },
        ],
        capabilities: [
          {
            table: 'Data',
            resource: 'Owners Item',
            action: 'Create',
          },
        ],
        capabIds: [],
        capabSetIds: [],
      };

      const duplicatedRoleNamePart = `${testData.roleName} (duplicate)`;

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesUsersSettingsView,
      ];

      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create user, data', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
            testData.capabilities.forEach((capability) => {
              capability.type = capability.table;
              cy.getCapabilityIdViaApi(capability).then((capabId) => {
                testData.capabIds.push(capabId);
              });
            });
            testData.capabilitySets.forEach((capabilitySet) => {
              capabilitySet.type = capabilitySet.table;
              cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                testData.capabSetIds.push(capabSetId);
              });
            });
          });
        });
      });

      before('Assign capabilities, role, login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
        cy.addRolesToNewUserApi(testData.user.userId, [testData.roleId]);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
        cy.getUserRoleIdByNameApi(`${duplicatedRoleNamePart}*`).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId, true);
        });
      });

      it(
        'C554636 Eureka | Duplicate an authorization role (thunderjet)',
        { tags: ['extendedPath', 'thunderjet', 'eureka', 'C554636'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickActionsButton();
          AuthorizationRoles.checkDuplicateOptionShown();
          AuthorizationRoles.clickDuplicateButton();
          AuthorizationRoles.cancelDuplicateRole();
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);
          AuthorizationRoles.duplicateRole(testData.roleName);

          AuthorizationRoles.checkCapabilitySetsAccordionCounter(
            `${testData.capabilitySets.length}`,
          );
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            `${testData.capabilities.length + testData.capabilitiesInSets.length}`,
          );
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.capabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.capabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
        },
      );
    });
  });
});
