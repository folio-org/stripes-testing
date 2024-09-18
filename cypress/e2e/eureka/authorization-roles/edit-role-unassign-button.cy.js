import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        roleAName: `Auto Role A C553051 ${randomPostfix}`,
        roleBName: `Auto Role B C553051 ${randomPostfix}`,
        roleCName: `Auto Role C C553051 ${randomPostfix}`,
        capabilitySets: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Procedural',
            resource: 'UI-Notes Item Assign-Unassign',
            action: 'Execute',
          },
        ],
        capabilitiesInSets: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar Endpoint Calendars',
            action: 'View',
          },
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar Endpoint Calendars CalendarId',
            action: 'View',
          },
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar Endpoint Dates',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Note Links Collection',
            action: 'Edit',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Note Types Collection',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Note Types Item',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Notes Collection',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Notes Domain',
            action: 'Manage',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Notes Item',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'UI-Notes Item',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Settings',
            resource: 'Module Notes Enabled',
            action: 'View',
          },
        ],
        capabilities: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Owners Item',
            action: 'Create',
          },
          {
            application: 'app-platform-minimal',
            table: 'Procedural',
            resource: 'Roles Collection',
            action: 'Execute',
          },
          {
            application: 'app-platform-minimal',
            table: 'Settings',
            resource: 'Settings Tags Enabled',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Configuration Entries Collection',
            action: 'View',
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

      before('Create roles, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
        });
        cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
          testData.roleAId = role.id;
        });
        cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
          testData.roleBId = role.id;
        });
        cy.createAuthorizationRoleApi(testData.roleCName).then((role) => {
          testData.roleCId = role.id;
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
        cy.addCapabilitiesToNewRoleApi(testData.roleAId, testData.capabIds);
        cy.addCapabilitySetsToNewRoleApi(testData.roleAId, testData.capabSetIds);
        cy.addCapabilitySetsToNewRoleApi(testData.roleBId, testData.capabSetIds);
        cy.addCapabilitiesToNewRoleApi(testData.roleCId, testData.capabIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleAId);
        cy.deleteAuthorizationRoleApi(testData.roleBId);
        cy.deleteAuthorizationRoleApi(testData.roleCId);
      });

      it(
        'C553051 Unassign all capabilities/sets from existing role using dedicated button (eureka)',
        { tags: ['criticalPath', 'eureka'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleAName);
          AuthorizationRoles.clickOnRoleName(testData.roleAName);
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
          AuthorizationRoles.clickUnassignAllCapabilitiesButton();
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set, false);
          });
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, false);
          });
          testData.capabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, false);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.verifyRoleViewPane(testData.roleAName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.checkCapabilitiesAccordionCounter('0');

          AuthorizationRoles.searchRole(testData.roleBName);
          AuthorizationRoles.clickOnRoleName(testData.roleBName);
          AuthorizationRoles.openForEdit();
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });
          testData.capabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          AuthorizationRoles.clickUnassignAllCapabilitiesButton();
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set, false);
          });
          testData.capabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, false);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.verifyRoleViewPane(testData.roleBName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.checkCapabilitiesAccordionCounter('0');

          AuthorizationRoles.searchRole(testData.roleCName);
          AuthorizationRoles.clickOnRoleName(testData.roleCName);
          AuthorizationRoles.openForEdit();
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          AuthorizationRoles.clickUnassignAllCapabilitiesButton();
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, false);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.verifyRoleViewPane(testData.roleCName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.checkCapabilitiesAccordionCounter('0');
        },
      );
    });
  });
});
