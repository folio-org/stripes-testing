import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C464313_UserRole_${getRandomPostfix()}`,
        capabilitySets: [
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships',
            action: 'Manage',
          },
          {
            table: 'Procedural',
            resource: 'UI-Invoice Invoice Pay',
            action: 'Execute',
          },
        ],
        capabilitiesInSets: [
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships Item',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships Item',
            action: 'Edit',
          },
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships Item',
            action: 'Create',
          },
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships Item',
            action: 'Delete',
          },
          {
            table: 'Data',
            resource: 'Finance Expense-Classes Item',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Finance Funds Item',
            action: 'View',
          },
          {
            table: 'Procedural',
            resource: 'UI-Invoice Invoice Pay',
            action: 'Execute',
          },
          {
            table: 'Procedural',
            resource: 'Invoice Item Pay',
            action: 'Execute',
          },
        ],
        expectedRowCounts: {
          capabilitySets: {
            Data: 1,
            Procedural: 1,
          },
          capabilities: {
            Data: 5,
            Procedural: 2,
          },
        },
        absentCapabilitySetTable: 'Settings',
        capabSetIds: [],
        capabIds: [],
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
            testData.capabilitiesInSets.forEach((capability) => {
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

      before('Login', () => {
        cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C464313 Verify capabilities shown for a role created via API with only capability set assigned (eureka)',
        { tags: ['extendedPath', 'eureka', 'eurekaPhase1', 'C464313'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });

          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.capabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });

          Object.entries(testData.expectedRowCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilitySetRows(table, count);
          });
          AuthorizationRoles.verifyCapabilitySetTableAbsent(testData.absentCapabilitySetTable);
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCheckboxesCountInCapabilitySetRow(set, 1);
          });

          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
          AuthorizationRoles.verifyCapabilityTableAbsent(testData.absentCapabilitySetTable);
          testData.capabilitiesInSets
            .filter((capab, index) => index < 1 && index > 4)
            .forEach((capability) => {
              AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(capability, 1);
            });
          AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(
            testData.capabilitiesInSets[1],
            4,
          );
        },
      );
    });
  });
});
