import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C431152 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        updatedRoleName: `Auto Role C431152 ${getRandomPostfix()} UPD`,
        updateRoleDescription: `Description ${getRandomPostfix()} UPD`,
        application: 'app-platform-minimal',
        originalCapabilities: [
          {
            table: 'Data',
            resource: 'Tags Collection',
            action: 'View',
          },
          {
            table: 'Procedural',
            resource: 'Login Password',
            action: 'Execute',
          },
        ],
        capabilityToSelect: {
          table: 'Settings',
          resource: 'UI-Tags Settings',
          action: 'Manage',
        },
        expectedCounts: {
          Data: 1,
          Settings: 1,
        },
        capabIds: [],
      };

      testData.originalCapabilities.forEach((capab) => {
        capab.application = testData.application;
      });
      testData.capabilityToSelect.application = testData.application;

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.createAuthorizationRoleApi().then((role) => {
            testData.roleName = role.name;
            testData.roleId = role.id;
            testData.originalCapabilities.forEach((capability) => {
              capability.type = capability.table;
              cy.getCapabilityIdViaApi(capability).then((capabId) => {
                testData.capabIds.push(capabId);
              });
            });
          });
        });
      });

      before('Assign capabilities and login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C431152 Assigning capabilities after role name edited (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
        () => {
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedRoleName,
            testData.updateRoleDescription,
          );
          cy.wait(1000);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName,
            testData.updateRoleDescription,
          );
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.selectCapabilityCheckbox(testData.originalCapabilities[1], false);
          AuthorizationRoles.selectCapabilityCheckbox(testData.capabilityToSelect);
          cy.wait(1000);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName,
            testData.updateRoleDescription,
          );
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(
            testData.originalCapabilities[0],
          );
          AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(
            testData.capabilityToSelect,
          );
          Object.entries(testData.expectedCounts).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
        },
      );
    });
  });
});
