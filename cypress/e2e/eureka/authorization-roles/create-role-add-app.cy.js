import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe(CAPABILITY_TYPES.SETTINGS, () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C496128 ${getRandomPostfix()}`,
        originalApplication: 'app-platform-minimal',
        newApplication: 'app-platform-complete',
        originalCapabilitySets: [
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'UI-Notes Item Assign-Unassign',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        originalCapabilities: [
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Validation Validate',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Users-keycloak Password-Reset-Link Validate',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        newCapabilitySet: {
          table: CAPABILITY_TYPES.SETTINGS,
          resource: 'Erm Settings',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        newCapabilitiesInSet: [
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Erm Settings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Erm Settings Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        newCapabilities: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Accounts Item',
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Accounts Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        expectedRowCounts: {
          capabilitySets: {
            Settings: 1,
            Procedural: 1,
          },
          capabilities: {
            Data: 8,
            Settings: 3,
            Procedural: 3,
          },
        },
        absentCapabilitySetTables: [CAPABILITY_TYPES.DATA],
        capabSetIds: [],
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

      before('Create user, login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteCapabilitySetsFromRoleApi(roleId);
          cy.deleteCapabilitiesFromRoleApi(roleId);
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C496123 Adding application when creating authorization role',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C496123'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);

          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.originalApplication);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.originalApplication]);
          testData.originalCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet);
          });
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });

          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.newApplication);
          AuthorizationRoles.clickSaveInModal();
          testData.originalCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.newCapabilitySet);
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName);

          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.originalCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });

          Object.entries(testData.expectedRowCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilitySetRows(table, count);
          });
          testData.absentCapabilitySetTables.forEach((absentTable) => {
            AuthorizationRoles.verifyCapabilitySetTableAbsent(absentTable);
          });
          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
        },
      );
    });
  });
});
