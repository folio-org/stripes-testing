import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C423998 ${getRandomPostfix()}`,
        roleDescription: `Description C423998 ${getRandomPostfix()}`,
        applicationName: 'app-platform-minimal',
        capabilitySet: {
          application: 'app-platform-minimal',
          table: 'Settings',
          resource: 'UI-Tags Settings',
          action: 'View',
        },
        capabilitiesInSet: [
          {
            table: 'Data',
            resource: 'Configuration Entries Collection',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Settings Tags Enabled',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Settings Tags Enabled',
            action: 'View',
          },
        ],
        capabilitiesToSelect: [
          {
            table: 'Data',
            resource: 'Addresstypes Item',
            action: 'Delete',
          },
          {
            table: 'Settings',
            resource: 'Module Notes Enabled',
            action: 'View',
          },
        ],
        expectedCounts: {
          capabilities: {
            Data: 2,
            Settings: 3,
          },
          capabilitySets: {
            Settings: 1,
          },
        },
        absentCapabilitySetTables: ['Data', 'Procedural'],
        absentCapabilityTables: ['Procedural'],
      };

      testData.capabilitySet.application = testData.applicationName;
      testData.capabilitiesInSet.forEach((capability) => {
        capability.application = testData.applicationName;
      });
      testData.capabilitiesToSelect.forEach((capability) => {
        capability.application = testData.applicationName;
      });

      before('Creating user, login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      after('Deleting user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C423998 Creating new authorization role (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.applicationName]);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySet);
          testData.capabilitiesToSelect.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet);
          testData.capabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          cy.intercept('POST', '/roles*').as('rolesCall');
          cy.intercept('POST', '/roles/capabilities*').as('capabilitiesCall');
          cy.intercept('POST', '/roles/capability-sets*').as('capabilitySetsCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@rolesCall').then((call) => {
            const roleId = call.response.body.id;
            testData.roleId = roleId;
            expect(call.request.body.name).to.eq(testData.roleName);
            expect(call.request.body.description).to.eq(testData.roleDescription);
            cy.wait('@capabilitiesCall').then((callCapabs) => {
              expect(callCapabs.request.body.capabilityIds).to.have.lengthOf(5);
              expect(callCapabs.request.body.roleId).to.eq(roleId);
            });
            cy.wait('@capabilitySetsCall').then((callCapabSets) => {
              expect(callCapabSets.request.body.capabilitySetIds).to.have.lengthOf(1);
              expect(callCapabSets.request.body.roleId).to.eq(roleId);
            });
          });
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet);
          AuthorizationRoles.verifyCapabilitySetCheckboxEnabled(testData.capabilitySet, false);
          Object.entries(testData.expectedCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapablitySets(table, count);
          });
          testData.absentCapabilitySetTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilitySetTableAbsent(table);
          });
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.capabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.capabilitiesToSelect.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          Object.entries(testData.expectedCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapablities(table, count);
          });
          testData.absentCapabilityTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilityTableAbsent(table);
          });
        },
      );
    });
  });
});
