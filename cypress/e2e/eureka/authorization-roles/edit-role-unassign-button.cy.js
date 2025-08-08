import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        roleAName: `AT_C553051_UserRole_A_${randomPostfix}`,
        roleBName: `AT_C553051_UserRole_B_${randomPostfix}`,
        roleCName: `AT_C553051_UserRole_C_${randomPostfix}`,
        capabilitySets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'UI-Notes Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        capabilitiesInSets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars AllOpenings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars CalendarId',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Calendar Endpoint Calendars SurroundingOpenings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Links Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Notes Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Notes Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'UI-Notes Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Module Notes Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        capabilities: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Owners Item',
            action: CAPABILITY_ACTIONS.CREATE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Roles Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Settings Tags Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Configuration Entries Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        capabSetIds: [],
        capabIds: [],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
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
        { tags: ['extendedPath', 'eureka', 'C553051'] },
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
