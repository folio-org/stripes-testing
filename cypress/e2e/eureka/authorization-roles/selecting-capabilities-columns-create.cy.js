import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C624253_UserRole_${getRandomPostfix()}`,
        applicationName: 'app-platform-minimal',
        capabilitySetsColumnToSelect: {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.VIEW,
        },
        capabilityColumnToSelect: {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.CREATE,
        },
        notSelectedCapabilitySetColumn: {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.EDIT,
        },
        notSelectedCapabilityColumn: {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.DELETE,
        },
        absentCapabilitySetTables: [CAPABILITY_TYPES.SETTINGS, CAPABILITY_TYPES.PROCEDURAL],
      };

      const capabSetsForTestUser = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Authorization-Roles Settings Admin',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Capabilities',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Role-Capability-Sets',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
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
        'C624253 Selecting all checkboxes in columns when creating new authorization role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C624253'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.selectCapabilityColumn(
            testData.capabilityColumnToSelect.type,
            testData.capabilityColumnToSelect.action,
          );
          AuthorizationRoles.getCapabilityCheckboxCountInColumn(
            testData.capabilityColumnToSelect.type,
            testData.capabilityColumnToSelect.action,
          ).then((capabCount) => {
            AuthorizationRoles.selectCapabilitySetColumn(
              testData.capabilitySetsColumnToSelect.type,
              testData.capabilitySetsColumnToSelect.action,
            );
            AuthorizationRoles.getCapabilitySetCheckboxCountInColumn(
              testData.capabilitySetsColumnToSelect.type,
              testData.capabilitySetsColumnToSelect.action,
            ).then((setCount) => {
              AuthorizationRoles.clickSaveButton();
              AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
              AuthorizationRoles.clickOnCapabilitySetsAccordion();
              AuthorizationRoles.getCapabilitySetCheckboxCountInColumn(
                testData.capabilitySetsColumnToSelect.type,
                testData.capabilitySetsColumnToSelect.action,
              ).then((setCountInView) => {
                cy.expect(setCount).to.eq(setCountInView);
              });
              AuthorizationRoles.verifyNoCheckboxesInCapabilitySetColumn(
                testData.notSelectedCapabilitySetColumn.type,
                testData.notSelectedCapabilitySetColumn.action,
              );
              testData.absentCapabilitySetTables.forEach((table) => {
                AuthorizationRoles.verifyCapabilitySetTableAbsent(table);
              });
              AuthorizationRoles.clickOnCapabilitiesAccordion();
              AuthorizationRoles.getCapabilityCheckboxCountInColumn(
                testData.capabilityColumnToSelect.type,
                testData.capabilityColumnToSelect.action,
              ).then((capabCountInView) => {
                cy.expect(capabCount).to.eq(capabCountInView);
              });
              AuthorizationRoles.verifyNoCheckboxesInCapabilityColumn(
                testData.notSelectedCapabilityColumn.type,
                testData.notSelectedCapabilityColumn.action,
              );
            });
          });
        },
      );
    });
  });
});
