import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        applicationName: 'app-platform-full',
        firstSelectedCapabilitySet: {
          table: 'Data',
          resource: 'Configuration',
          action: 'Manage',
        },
        secondSelectedCapabilitySet: {
          table: 'Settings',
          resource: 'UI-Notes Settings',
          action: 'Edit',
        },
        capabilitiesInSelectedSets: [
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
            resource: 'Note Types Item',
            action: 'Edit',
          },
          {
            table: 'Data',
            resource: 'Note Types Item',
            action: 'Create',
          },
          {
            table: 'Data',
            resource: 'Note Types Item',
            action: 'Delete',
          },
          {
            table: 'Settings',
            resource: 'Settings Notes Enabled',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'UI-Notes Settings',
            action: 'Edit',
          },
        ],
        expectedCounts: {
          capabilitySets: {
            Data: 1,
            Settings: 1,
          },
          capabilities: {
            Data: 5,
            Settings: 2,
          },
        },
      };

      testData.firstSelectedCapabilitySet.application = testData.applicationName;
      testData.secondSelectedCapabilitySet.application = testData.applicationName;

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C436928 Creating new authorization role (adding only capability sets) (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'C436928'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.checkSaveButton(true);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          // TO DO: uncomment when apps will be split (action takes too much resources with all lines in one app)
          // AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.applicationName]);
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
