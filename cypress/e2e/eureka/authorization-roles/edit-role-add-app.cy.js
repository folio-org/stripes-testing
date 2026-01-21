import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C496128_UserRole_${getRandomPostfix()}`,
        originalApplications: ['app-platform-minimal', 'app-licenses'],
        newApplication: 'app-acquisitions',
        originalCapabilitySets: [
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'UI-Notes Item Assign-Unassign',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        originalCapabilitiesInSets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Locale Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Mod-Settings Entries Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Mod-Settings Global Read Stripes-Core Prefs',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Mod-Settings Owner Read Stripes-Core Prefs',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Links Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Links Collection',
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Notes Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Notes Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'UI-Notes Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Module Notes Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Stripes-Core Settings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'UI-Notes Item Assign-Unassign',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        originalCapabilities: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Login Event Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Licenses Admin Action',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        newCapabilitySet: {
          table: CAPABILITY_TYPES.PROCEDURAL,
          resource: 'UI-Finance',
          action: CAPABILITY_ACTIONS.EXECUTE,
        },
        newCapabilitiesInSet: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Finance Budgets-Expense-Classes-Totals Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Finance Expense-Classes Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Finance Fiscal-Years Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Finance Fiscal-Years Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Finance Fund-Types Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        newCapabilities: [
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Module Finance Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Invoice Item Cancel',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        expectedRowCounts: {
          capabilitySets: {
            Procedural: 2,
          },
          capabilities: {
            Data: 16,
            Settings: 3,
            Procedural: 4,
          },
        },
        absentCapabilitySetTables: [CAPABILITY_TYPES.DATA, CAPABILITY_TYPES.SETTINGS],
        capabSetIds: [],
        capabIds: [],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
      ];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
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
              testData.originalCapabilitySets.forEach((capabilitySet) => {
                capabilitySet.type = capabilitySet.table;
                cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                  testData.capabSetIds.push(capabSetId);
                });
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

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C496128 Adding application when editing authorization role',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C496128'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);

          AuthorizationRoles.openForEdit();
          testData.originalCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.originalCapabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.newApplication);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.newCapabilitySet);
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          testData.originalCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.originalCapabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);

          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          testData.originalCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.originalCapabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });

          Object.entries(testData.expectedRowCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilitySetRows(table, count);
          });
          testData.absentCapabilitySetTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilitySetTableAbsent(table);
          });
          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
        },
      );
    });
  });
});
