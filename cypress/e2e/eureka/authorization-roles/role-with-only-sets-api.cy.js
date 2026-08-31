import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C464313_UserRole_${getRandomPostfix()}`,
        capabilitySets: [
          {
            table: 'Data',
            resource: 'Organizations Settings',
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
            resource: 'Organizations Settings',
            action: 'Manage',
          },
          {
            table: 'Settings',
            resource: 'UI-Organizations Settings',
            action: 'View',
          },
          {
            table: 'Procedural',
            resource: 'UI-Invoice Invoice Pay',
            action: 'Execute',
          },
        ],
        expectedRowCounts: {
          capabilitySets: {
            Data: 1,
            Procedural: 1,
          },
          capabilities: {
            Data: 1,
            Settings: 1,
            Procedural: 1,
          },
        },
        capabSetIds: [],
        capabIds: [],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
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
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCheckboxesCountInCapabilitySetRow(set, 1);
          });

          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
          testData.capabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(capability, 1);
          });
        },
      );
    });
  });
});
