import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        capabIds: [],
        roleName: `AT_C503019_UserRole_${randomPostfix}`,
        roleDescription: `Description C503019 ${randomPostfix}`,
        updatedRoleName: `AT_C503019_UserRole_${randomPostfix} UPD`,
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
            resource: 'Acquisition Piece Events',
            action: 'View',
          },
          {
            table: 'Procedural',
            resource: 'UI-Receiving',
            action: 'Execute',
          },
        ],
        additionalCapabilitySets: [
          {
            table: 'Data',
            resource: 'Calendar',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar',
            action: 'Create',
          },
        ],
        numberOfCapabilitiesInAdditionalSets: 7,
      };

      const capabilitiesInSetSelected = testData.capabilitiesInSet.filter(
        (capab, index) => index <= 2,
      );
      const capabilitiesInSetUnselected = testData.capabilitiesInSet.filter(
        (capab, index) => index > 2,
      );

      const capabSetsForTestUser = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before('Create user, data', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsForTestUser,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.getAdminToken();
          cy.createAuthorizationRoleApi(testData.roleName, testData.roleDescription).then(
            (role) => {
              testData.roleId = role.id;
              capabilitiesInSetSelected.forEach((capability) => {
                capability.type = capability.table;
                cy.getCapabilityIdViaApi(capability).then((capabId) => {
                  testData.capabIds.push(capabId);
                });
              });
              testData.additionalCapabilities.forEach((capability) => {
                capability.type = capability.table;
                cy.getCapabilityIdViaApi(capability).then((capabId) => {
                  testData.capabIds.push(capabId);
                });
              });
            },
          );
        });
      });

      before('Assign capabilities, login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C503019 Verify capabilities selected/deselected when selecting/deselecting a capability set when editing a role (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C503019'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEdit();

          AuthorizationRoles.fillRoleNameDescription(testData.updatedRoleName);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet, false);
          capabilitiesInSetSelected.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });
          testData.additionalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });

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
          capabilitiesInSetSelected.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });
          testData.additionalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability, true, true);
          });
          capabilitiesInSetUnselected.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxUncheckedAndEnabled(capability);
          });
          testData.additionalCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet);
          });
          AuthorizationRoles.clickSaveButton();

          AuthorizationRoles.checkAfterSaveEdit(testData.updatedRoleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('2');
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            capabilitiesInSetSelected.length +
              testData.additionalCapabilities.length +
              testData.numberOfCapabilitiesInAdditionalSets +
              '',
          );
        },
      );
    });
  });
});
