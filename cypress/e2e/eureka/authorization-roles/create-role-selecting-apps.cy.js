import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C430260 ${getRandomPostfix()}`,
        roleDescription: `Description C430260 ${getRandomPostfix()}`,
        firstApplicationName: 'app-platform-minimal',
        secondApplicationName: 'app-platform-complete',
        capabilities: [
          {
            table: 'Data',
            application: 'app-platform-complete',
            resource: 'Erm Entitlements Item',
            action: 'View',
          },
          {
            table: 'Data',
            application: 'app-platform-minimal',
            resource: 'Addresstypes Item',
            action: 'Delete',
          },
          {
            table: 'Settings',
            application: 'app-platform-complete',
            resource: 'Mod-Circulation Admin Settings',
            action: 'Edit',
          },
          {
            table: 'Settings',
            application: 'app-platform-minimal',
            resource: 'UI-Tags Settings',
            action: 'View',
          },
          {
            table: 'Procedural',
            application: 'app-platform-complete',
            resource: 'Erm Packages Collection',
            action: 'Execute',
          },
          {
            table: 'Procedural',
            application: 'app-platform-minimal',
            resource: 'Users-bl Password-Reset-Link Reset',
            action: 'Execute',
          },
        ],
        expectedCounts: {
          capabilities: {
            Data: 2,
            Settings: 2,
            Procedural: 2,
          },
        },
      };

      const capabilityCallRegExp = new RegExp(
        `\\/capabilities\\?limit=\\d{1,}&query=applicationId==\\(${testData.firstApplicationName}-.{1,}or.{1,}${testData.secondApplicationName}-.{1,}\\)`,
      );

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      before(() => {
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

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteCapabilitiesFromRoleApi(roleId);
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C430260 Selecting applications when creating new authorization role (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'eurekaSnapshotECS'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.checkSaveButton(true);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.firstApplicationName);
          AuthorizationRoles.selectApplicationInModal(testData.secondApplicationName);
          cy.wait(1000);
          cy.intercept('GET', capabilityCallRegExp).as('capabilities');
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.waitCapabilitiesShown();
          cy.wait('@capabilities').its('response.statusCode').should('eq', 200);
          // TO DO: uncomment the following step when applications will be divided into multiple small entities
          // Currently, two apps used here include all existing capabilities/sets, and handling them requires unreasonable amount of resources
          // AuthorizationRoles.verifyAppNamesInCapabilityTables([
          //   testData.firstApplicationName,
          //   testData.secondApplicationName,
          // ]);
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          cy.wait(1000);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion(false);
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          Object.entries(testData.expectedCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
        },
      );
    });
  });
});
