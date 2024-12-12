import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C434129 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        applicationName: 'app-platform-minimal',
        selectedCapabilitySet: {
          table: 'Settings',
          resource: 'UI-Tags Settings',
          action: 'Manage',
        },
        capabilitiesInSelectedSet: [
          {
            table: 'Data',
            resource: 'Configuration Entries Collection',
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
            table: 'Settings',
            resource: 'Settings Enabled',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Settings Tags Enabled',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'UI-Tags Settings',
            action: 'View',
          },
        ],
        expectedCounts: {
          capabilitySets: {
            Settings: 1,
          },
          capabilities: {
            Data: 3,
            Settings: 3,
          },
        },
      };

      testData.selectedCapabilitySet.application = testData.applicationName;
      testData.capabilitiesInSelectedSet.forEach((capability) => {
        capability.application = testData.applicationName;
      });

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.updateRolesForUserApi(testData.user.userId, []);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C434129 Verify capabilities selected/deselected when selecting/deselecting a capability set when creating a role (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.applicationName]);
          testData.capabilitiesInSelectedSet.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(
            testData.selectedCapabilitySet,
            false,
          );
          testData.capabilitiesInSelectedSet.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability, false);
          });
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.selectedCapabilitySet);
          testData.capabilitiesInSelectedSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.capabilitiesInSelectedSet.forEach((capability) => {
            AuthorizationRoles.clickOnCheckedDisabledCheckbox(capability);
          });
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.selectedCapabilitySet, false);
          testData.capabilitiesInSelectedSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxUncheckedAndEnabled(capability);
          });
          testData.capabilitiesInSelectedSet.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(
            testData.selectedCapabilitySet,
            false,
          );
        },
      );
    });
  });
});
