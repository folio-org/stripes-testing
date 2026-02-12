import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C436928_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        applicationName: 'app-platform-minimal',
        firstSelectedCapabilitySet: {
          table: 'Data',
          resource: 'Configuration',
          action: 'Manage',
        },
        secondSelectedCapabilitySet: {
          table: 'Procedural',
          resource: 'UI-Notes Item Assign-Unassign',
          action: 'Execute',
        },
        capabilitiesInSelectedSets: [
          {
            table: 'Data',
            resource: 'Configuration',
            action: 'Manage',
          },
          {
            table: 'Data',
            resource: 'Configuration Entries Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Configuration Entries Item',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Configuration Entries Item',
            action: 'Edit',
          },
          {
            table: 'Data',
            resource: 'Configuration Entries Item',
            action: 'Create',
          },
          {
            table: 'Data',
            resource: 'Configuration Entries Item',
            action: 'Delete',
          },
          {
            table: 'Data',
            resource: 'Configuration Audit Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Note Links Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Note Links Collection',
            action: 'Edit',
          },
          {
            table: 'Data',
            resource: 'Note Types Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Note Types Item',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Notes Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Notes Item',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'UI-Notes Item',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Module Notes Enabled',
            action: 'View',
          },
          {
            table: 'Procedural',
            resource: 'UI-Notes Item Assign-Unassign',
            action: 'Execute',
          },
        ],
        expectedCounts: {
          capabilitySets: {
            Data: 1,
            Procedural: 1,
          },
          capabilities: {
            Data: 14,
            Settings: 2,
            Procedural: 1,
          },
        },
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
      ];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
            AuthorizationRoles.waitContentLoading();
          }, 20_000);
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C436928 Creating new authorization role (adding only capability sets) (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C436928'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.checkSaveButton(true);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.applicationName]);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.firstSelectedCapabilitySet);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.secondSelectedCapabilitySet);
          testData.capabilitiesInSelectedSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          cy.intercept('POST', '/roles*').as('roles');
          cy.intercept('POST', '/roles/capability-sets*').as('capabilitySets');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@roles').then((res) => {
            expect(res.response.body.name).to.eq(testData.roleName);
            expect(res.response.body.description).to.eq(testData.roleDescription);
            testData.roleId = res.response.body.id;
            cy.wait('@capabilitySets').then((res2) => {
              expect(res2.response.body.totalRecords).to.eq(2);
              res2.response.body.roleCapabilitySets.forEach((set) => {
                expect(set.roleId).to.eq(res.response.body.id);
              });
            });
            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName);
            AuthorizationRoles.clickOnCapabilitySetsAccordion();
            AuthorizationRoles.clickOnCapabilitiesAccordion();
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(
              testData.firstSelectedCapabilitySet,
            );
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(
              testData.secondSelectedCapabilitySet,
            );
            AuthorizationRoles.verifyCapabilitySetCheckboxEnabled(
              testData.firstSelectedCapabilitySet,
              false,
            );
            AuthorizationRoles.verifyCapabilitySetCheckboxEnabled(
              testData.secondSelectedCapabilitySet,
              false,
            );
            testData.capabilitiesInSelectedSets.forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });
            Object.entries(testData.expectedCounts.capabilities).forEach(([table, count]) => {
              AuthorizationRoles.checkCountOfCapabilityRows(table, count);
            });
            Object.entries(testData.expectedCounts.capabilitySets).forEach(([table, count]) => {
              AuthorizationRoles.checkCountOfCapabilitySetRows(table, count);
            });
          });
        },
      );
    });
  });
});
