import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

let testData;
let capabilitySetToRemove;
let capabilitiesToRemove;

describe(
  'Eureka',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Settings', () => {
      describe('Authorization roles', () => {
        beforeEach('Create role, user', () => {
          testData = {
            roleName: `AT_C424001_UserRole_${getRandomPostfix()}`,
            roleDescription: `Description C424001 ${getRandomPostfix()}`,
            updatedRoleName: `AT_C424001_UserRole_${getRandomPostfix()} UPD`,
            updatedRoleDescription: `Description C424001 ${getRandomPostfix()} UPD`,
            originalCapabilitySets: [
              {
                table: CAPABILITY_TYPES.DATA,
                resource: 'UI-Notes Item',
                action: CAPABILITY_ACTIONS.EDIT,
              },
            ],
            originalCapabilitiesInSets: [
              {
                table: CAPABILITY_TYPES.DATA,
                resource: 'UI-Notes Item',
                action: CAPABILITY_ACTIONS.VIEW,
              },
              {
                table: CAPABILITY_TYPES.DATA,
                resource: 'UI-Notes Item',
                action: CAPABILITY_ACTIONS.EDIT,
              },
            ],
            originalCapabilities: [
              {
                table: CAPABILITY_TYPES.DATA,
                resource: 'UI-Tags',
                action: CAPABILITY_ACTIONS.VIEW,
              },
              {
                table: CAPABILITY_TYPES.DATA,
                resource: 'UI-Tags',
                action: CAPABILITY_ACTIONS.MANAGE,
              },
            ],
            newCapabilitySet: {
              table: CAPABILITY_TYPES.PROCEDURAL,
              resource: 'UI-Notes Item Assign-Unassign',
              action: CAPABILITY_ACTIONS.EXECUTE,
            },
            newCapabilitiesInSet: [
              {
                table: CAPABILITY_TYPES.PROCEDURAL,
                resource: 'UI-Notes Item Assign-Unassign',
                action: CAPABILITY_ACTIONS.EXECUTE,
              },
            ],
            newCapabilities: [
              {
                table: CAPABILITY_TYPES.SETTINGS,
                resource: 'UI-Notes Settings',
                action: CAPABILITY_ACTIONS.EDIT,
              },
            ],
            expectedRowCounts: {
              capabilitySets: {
                Procedural: 1,
              },
              capabilities: {
                Settings: 1,
                Data: 2,
                Procedural: 1,
              },
            },
            absentCapabilitySetTables: [CAPABILITY_TYPES.DATA, CAPABILITY_TYPES.SETTINGS],
            capabSetIds: [],
            capabIds: [],
          };

          capabilitySetToRemove = testData.originalCapabilitySets[0];
          capabilitiesToRemove = [testData.originalCapabilities[1]];

          const capabSetsToAssign = [CapabilitySets.uiAuthorizationRolesSettingsEdit];

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

        beforeEach('Assign capabilities and login', () => {
          cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
          cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
          }, 20_000);
        });

        afterEach('Delete user, role', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
          cy.deleteCapabilitiesFromRoleApi(testData.roleId);
          cy.deleteAuthorizationRoleApi(testData.roleId);
        });

        it(
          'C424001 Viewing/editing existing authorization role',
          { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C424001'] },
          () => {
            const roleViewUrl = `${Cypress.config().baseUrl}${TopMenu.settingsAuthorizationRoles}/${
              testData.roleId
            }`;

            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName);
            cy.url().then((url) => expect(url).to.eq(roleViewUrl));
            AuthorizationRoles.clickOnCapabilitySetsAccordion();
            AuthorizationRoles.clickOnCapabilitiesAccordion();
            testData.originalCapabilitySets.forEach((capabilitySet) => {
              AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
            });
            testData.originalCapabilities.forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });

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
            AuthorizationRoles.fillRoleNameDescription(
              testData.updatedRoleName,
              testData.updatedRoleDescription,
            );
            AuthorizationRoles.selectCapabilitySetCheckbox(testData.newCapabilitySet);
            AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySetToRemove, {
              isSelected: false,
              confirmModal: true,
            });
            testData.newCapabilities.forEach((capability) => {
              AuthorizationRoles.selectCapabilityCheckbox(capability);
            });
            capabilitiesToRemove.forEach((capability) => {
              AuthorizationRoles.selectCapabilityCheckbox(capability, false);
            });

            // for unclear reasons, the test hangs without this waiter
            cy.wait(2000);
            cy.intercept('PUT', `/roles/${testData.roleId}`).as('roleCall');
            cy.intercept('PUT', /\/roles\/.+\/capabilities/).as('capabilitiesCall');
            cy.intercept('PUT', /\/roles\/.+\/capability-sets/).as('capabilitySetsCall');
            AuthorizationRoles.clickSaveButton();
            cy.wait('@roleCall').then((call) => {
              expect(call.response.statusCode).to.eq(204);
              expect(call.request.body.name).to.eq(testData.updatedRoleName);
              expect(call.request.body.description).to.eq(testData.updatedRoleDescription);
            });
            cy.wait('@capabilitiesCall').then((call) => {
              expect(call.response.statusCode).to.eq(204);
              expect(call.request.body.capabilityIds).to.have.lengthOf(2);
            });
            cy.wait('@capabilitySetsCall').then((call) => {
              expect(call.response.statusCode).to.eq(204);
              expect(call.request.body.capabilitySetIds).to.have.lengthOf(1);
            });
            AuthorizationRoles.checkAfterSaveEdit(
              testData.updatedRoleName,
              testData.updatedRoleDescription,
            );
            cy.url().then((url) => expect(url).to.eq(roleViewUrl));
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
            Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
              AuthorizationRoles.checkCountOfCapabilityRows(table, count);
            });
          },
        );
      });
    });
  },
);
