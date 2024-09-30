import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Original role C554636 ${getRandomPostfix()}`,
        application: 'app-platform-full',
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
            resource: 'Calendar Endpoint Calendars',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Calendars CalendarId',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Dates',
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

      testData.capabilitySets.forEach((set) => {
        set.application = testData.application;
      });
      testData.capabilitiesInSets.forEach((capab) => {
        capab.application = testData.application;
      });
      testData.capabilities.forEach((capab) => {
        capab.application = testData.application;
      });

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

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
      });

      it(
        'C554636 Eureka | Duplicate an authorization role (thunderjet)',
        { tags: ['extendedPath', 'thunderjet'] },
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
