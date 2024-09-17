import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C496128 ${getRandomPostfix()}`,
        originalApplication: 'app-platform-minimal',
        newApplication: 'app-platform-complete',
        originalCapabilitySets: [
          {
            table: 'Settings',
            resource: 'Settings Developer Enabled',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Settings Authorization-Roles Enabled',
            action: 'View',
          },
        ],
        originalCapabilitiesInSets: [
          {
            table: 'Settings',
            resource: 'Settings Enabled',
            action: 'View',
          },
        ],
        originalCapabilities: [
          {
            table: 'Procedural',
            resource: 'Validation Validate',
            action: 'Execute',
          },
          {
            table: 'Procedural',
            resource: 'Users-keycloak Password-Reset-Link Validate',
            action: 'Execute',
          },
        ],
        newCapabilitySet: {
          table: 'Settings',
          resource: 'UI-Users Settings Waives',
          action: 'View',
        },
        newCapabilitiesInSet: [
          {
            table: 'Data',
            resource: 'Waives Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Waives Item',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Settings Users Enabled',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Settings Enabled',
            action: 'View',
          },
        ],
        newCapabilities: [
          {
            table: 'Data',
            resource: 'Accounts Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Accounts Item',
            action: 'View',
          },
        ],
        expectedRowCounts: {
          capabilitySets: {
            Settings: 3,
          },
          capabilities: {
            Data: 4,
            Settings: 2,
            Procedural: 2,
          },
        },
        absentCapabilitySetTables: ['Data', 'Procedural'],
        capabSetIds: [],
        capabIds: [],
      };

      testData.originalCapabilitySets.forEach((set) => {
        set.application = testData.originalApplication;
      });
      testData.originalCapabilitiesInSets.forEach((capab) => {
        capab.application = testData.originalApplication;
      });
      testData.originalCapabilities.forEach((capab) => {
        capab.application = testData.originalApplication;
      });
      testData.newCapabilitySet.application = testData.newApplication;
      testData.newCapabilitiesInSet.forEach((capab) => {
        capab.application = testData.newApplication;
      });
      testData.newCapabilities.forEach((capab) => {
        capab.application = testData.newApplication;
      });

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
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
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'eurekaSnapshotECS'] },
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
          testData.originalCapabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
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
          testData.originalCapabilitiesInSets.forEach((capability) => {
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
