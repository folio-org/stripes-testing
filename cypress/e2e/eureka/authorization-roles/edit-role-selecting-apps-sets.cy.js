import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe(CAPABILITY_TYPES.SETTINGS, () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C430262_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        originalApplications: ['app-platform-minimal', 'app-dcb'],
        newApplication: 'app-acquisitions',
        originalCapabilitySets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Capabilities',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
        ],
        originalCapabilitiesInSets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Capabilities',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Capabilities Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Capabilities Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Capability-Sets Capabilities Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Capability-Sets Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        originalCapabilities: [
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Auth Token',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Dcb Transactions',
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
            Procedural: 1,
          },
          capabilities: {
            Settings: 1,
            Procedural: 3,
            Data: 5,
          },
        },
        absentCapabilitySetTables: [CAPABILITY_TYPES.DATA, CAPABILITY_TYPES.SETTINGS],
        capabSetIds: [],
        capabIds: [],
      };

      const regExpBase = `\\?limit=\\d{1,}&query=applicationId==\\(${testData.originalApplications[1]}-.{1,}or.{1,}${testData.newApplication}-.{1,}\\)`;
      const capabilitiesCallRegExp = new RegExp(`\\/capabilities${regExpBase}`);
      const capabilitySetsCallRegExp = new RegExp(`\\/capability-sets${regExpBase}`);

      const capabSetsToAssign = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Authorization-Roles Settings',
          action: CAPABILITY_ACTIONS.EDIT,
        },
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
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C430262 Selecting/deselecting applications when editing authorization role',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'C430262'] },
        () => {
          AuthorizationRoles.waitContentLoading();
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
          AuthorizationRoles.selectApplicationInModal(testData.originalApplications[0], false);
          AuthorizationRoles.selectApplicationInModal(testData.newApplication);
          cy.intercept('GET', capabilitiesCallRegExp).as('capabilities');
          cy.intercept('GET', capabilitySetsCallRegExp).as('capabilitySets');
          cy.wait(1000);
          AuthorizationRoles.clickSaveInModal();
          cy.wait('@capabilities').its('response.statusCode').should('eq', 200);
          cy.wait('@capabilitySets').its('response.statusCode').should('eq', 200);
          cy.wait(2000);
          AuthorizationRoles.verifyAppNamesInCapabilityTables([
            testData.newApplication,
            testData.originalApplications[1],
          ]);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.newCapabilitySet);
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          cy.wait(3000);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });

          Object.entries(testData.expectedRowCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilitySetRows(table, count);
          });
          testData.absentCapabilitySetTables.forEach((capabilitySetTable) => {
            AuthorizationRoles.verifyCapabilitySetTableAbsent(capabilitySetTable);
          });
          AuthorizationRoles.verifyCheckboxesCountInCapabilitySetRow(testData.newCapabilitySet, 1);
          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(capability, 1);
          });
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(capability, 1);
          });
        },
      );
    });
  });
});
