import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C430264 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        firstApplicationName: 'app-platform-minimal',
        secondApplicationName: 'app-platform-complete',
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
        ],
        expectedCounts: {
          capabilitySets: {
            Data: 1,
            Settings: 1,
          },
          capabilities: {
            Data: 5,
            Settings: 1,
          },
        },
      };

      const regExpBase = `\\?limit=\\d{1,}&query=applicationId=${testData.firstApplicationName}-.{1,}or.{1,}applicationId=${testData.firstApplicationName}-.{1,}`;
      const capabilityCallRegExp = new RegExp(`\\/capabilities${regExpBase}`);
      const capabilitySetsCallRegExp = new RegExp(`\\/capability-sets${regExpBase}`);

      testData.firstSelectedCapabilitySet.application = testData.applicationName;
      testData.secondSelectedCapabilitySet.application = testData.applicationName;

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C430264 Selecting applications when creating new authorization role (no capabilities selected) (eureka)',
        { tags: ['smoke', 'eureka'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.checkSaveButton(true);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();
          AuthorizationRoles.selectApplicationInModal(testData.firstApplicationName);
          AuthorizationRoles.selectApplicationInModal(testData.secondApplicationName);
          cy.intercept('GET', capabilityCallRegExp).as('capabilities');
          cy.intercept('GET', capabilitySetsCallRegExp).as('capabilitySets');
          AuthorizationRoles.clickSaveInModal();
          cy.wait('@capabilities').its('response.status').should('eq', 200);
          cy.wait('@capabilitySets').its('response.status').should('eq', 200);
          AuthorizationRoles.verifyAppNamesInCapabilityTables([
            testData.firstApplicationName,
            testData.secondApplicationName,
          ]);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate();
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          // AuthorizationRoles.verifyCapabilitySetCheckboxCheckedAndDisabled(
          //   testData.firstSelectedCapabilitySet,
          // );
          // AuthorizationRoles.verifyCapabilitySetCheckboxCheckedAndDisabled(
          //   testData.secondSelectedCapabilitySet,
          // );
          // testData.capabilitiesInSelectedSets.forEach((capability) => {
          //   AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          // });
          // Object.entries(testData.expectedCounts.capabilities).forEach(([table, count]) => {
          //   AuthorizationRoles.checkCountOfCapablities(table, count);
          // });
          // Object.entries(testData.expectedCounts.capabilitySets).forEach(([table, count]) => {
          //   AuthorizationRoles.checkCountOfCapablitySets(table, count);
          // });
        },
      );
    });
  });
});
