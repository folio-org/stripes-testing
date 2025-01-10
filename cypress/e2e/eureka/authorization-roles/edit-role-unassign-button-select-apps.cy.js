import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const applications = ['app-platform-complete', 'app-platform-minimal'];
      const testData = {
        roleName: `Auto Role C553052 ${getRandomPostfix()}`,
        capabilitySets: [
          {
            application: applications[0],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[1],
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Notes Settings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        capabilitiesInSets: [
          {
            application: applications[0],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[0],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[0],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars CalendarId',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[0],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars AllOpenings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[0],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars SurroundingOpenings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[1],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[1],
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[1],
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Settings Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[1],
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Settings Notes Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            application: applications[1],
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Notes Settings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        capabilities: [
          {
            application: applications[0],
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Feesfines Accounts Cancel',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
          {
            application: applications[1],
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Roles Collection',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        capabSetIds: [],
        capabIds: [],
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before('Create roles, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
        });
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;
        });
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

      before('Assign capabilities, login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C553052 Unassign all capabilities/sets from existing role using dedicated button (selected and deselected applications) (eureka)',
        { tags: ['extendedPath', 'eureka', 'eurekaTemporaryECS', 'C553052'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEdit();
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.capabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });

          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(applications[1], false);
          AuthorizationRoles.clickSaveInModal();
          testData.capabilitySets
            .filter((item) => item.application === applications[0])
            .forEach((set) => {
              AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
            });
          testData.capabilities
            .filter((item) => item.application === applications[0])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
            });
          testData.capabilitiesInSets
            .filter((item) => item.application === applications[0])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });

          AuthorizationRoles.clickUnassignAllCapabilitiesButton();
          testData.capabilitySets
            .filter((item) => item.application === applications[0])
            .forEach((set) => {
              AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set, false);
            });
          testData.capabilities
            .filter((item) => item.application === applications[0])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, false);
            });
          testData.capabilitiesInSets
            .filter((item) => item.application === applications[0])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, false);
            });
          AuthorizationRoles.clickSaveButton();

          AuthorizationRoles.verifyRoleViewPane(testData.roleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.checkCapabilitiesAccordionCounter('0');
          AuthorizationRoles.clickOnCapabilitySetsAccordion(false);
          AuthorizationRoles.clickOnCapabilitiesAccordion(false);
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
        },
      );
    });
  });
});
