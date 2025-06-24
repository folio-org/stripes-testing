import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C434129_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description C434129 ${getRandomPostfix()}`,
        applicationName: 'app-acquisitions',
        capabilitySet: {
          table: 'Data',
          resource: 'Acquisitions-Units Memberships',
          action: 'Manage',
        },
        capabilitiesInSet: [
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships',
            action: 'Manage',
          },
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
        ],
        additionalCapabilities: [
          {
            table: 'Data',
            resource: 'Batch-Groups Item',
            action: 'View',
          },
          {
            table: 'Procedural',
            resource: 'UI-Receiving',
            action: 'Execute',
          },
        ],
      };

      const capabilitiesInSetToRemainSelected = testData.capabilitiesInSet.filter(
        (capab, index) => index > 2,
      );
      const capabilitiesInSetToDeselect = testData.capabilitiesInSet.filter(
        (capab, index) => index <= 2,
      );

      const capabSetsForTestUser = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsForTestUser);
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
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C434129 Verify capabilities selected/deselected when selecting/deselecting a capability set when creating a role (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C434129'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          testData.capabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet, false);
          capabilitiesInSetToDeselect.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability, false);
          });
          testData.additionalCapabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet, false);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySet);
          testData.capabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.additionalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });
          testData.capabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.clickOnCheckedDisabledCheckbox(capability);
          });
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySet, false);
          capabilitiesInSetToRemainSelected.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });
          testData.additionalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });
          capabilitiesInSetToDeselect.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxUncheckedAndEnabled(capability);
          });
          capabilitiesInSetToDeselect.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet, false);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            testData.capabilitiesInSet.length + testData.additionalCapabilities.length + '',
          );
        },
      );
    });
  });
});
