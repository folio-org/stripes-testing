import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C624254_UserRole_${getRandomPostfix()}`,
        originalCapabilitySet: {
          table: CAPABILITY_TYPES.SETTINGS,
          resource: 'Serials-Management Settings',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        originalCapabilitiesInSet: [
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Serials-Management Settings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        originalCapabilities: [
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Auth Token',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        capabilitySetsColumnToSelect: {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.CREATE,
        },
        capabilityColumnToSelect: {
          type: CAPABILITY_TYPES.PROCEDURAL,
          action: CAPABILITY_ACTIONS.EXECUTE,
        },
        notSelectedCapabilitySetColumn: {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.EDIT,
        },
        notSelectedCapabilityColumn: {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        absentCapabilitySetTables: [CAPABILITY_TYPES.DATA, CAPABILITY_TYPES.PROCEDURAL],
        capabSetIds: [],
        capabIds: [],
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

      const capabsForTestUser = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'Settings Enabled',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsForTestUser,
            capabSetsForTestUser,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName, testData.roleDescription).then(
            (role) => {
              testData.roleId = role.id;
              testData.originalCapabilities.forEach((capability) => {
                capability.type = capability.table;
                cy.getCapabilityIdViaApi(capability).then((capabId) => {
                  testData.capabIds.push(capabId);
                });
              });
              testData.originalCapabilitySet.type = testData.originalCapabilitySet.table;
              cy.getCapabilitySetIdViaApi(testData.originalCapabilitySet).then((capabSetId) => {
                testData.capabSetIds.push(capabSetId);
              });
            },
          );
        });
      });

      before('Assign capabilities and login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C624254 Selecting all checkboxes in columns when editing authorization role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C624254'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.originalCapabilitySet);
          testData.originalCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
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
              AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
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
              AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.originalCapabilitySet);
              testData.originalCapabilitiesInSet.forEach((capability) => {
                AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
              });
              testData.originalCapabilities.forEach((capability) => {
                AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
              });

              cy.reload();
              cy.wait('@/authn/refresh', { timeout: 20000 });
              AuthorizationRoles.verifyRoleViewPane(testData.roleName);
              AuthorizationRoles.openForEdit();
              AuthorizationRoles.selectCapabilityColumn(
                testData.capabilityColumnToSelect.type,
                testData.capabilityColumnToSelect.action,
                false,
              );
              AuthorizationRoles.selectCapabilitySetColumn(
                testData.capabilitySetsColumnToSelect.type,
                testData.capabilitySetsColumnToSelect.action,
                false,
              );
              AuthorizationRoles.clickSaveButton();
              AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
              AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
              AuthorizationRoles.clickOnCapabilitySetsAccordion();
              AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.originalCapabilitySet);
              AuthorizationRoles.checkCapabilitiesAccordionCounter(
                `${testData.originalCapabilitiesInSet.length}`,
              );
              AuthorizationRoles.clickOnCapabilitiesAccordion();
              testData.originalCapabilitiesInSet.forEach((capability) => {
                AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
              });
            });
          });
        },
      );
    });
  });
});
