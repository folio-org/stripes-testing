import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C436929 ${getRandomPostfix()}`,
        roleDescription: `Description C436929 ${getRandomPostfix()}`,
        updatedRoleName: `Auto Role C436929 ${getRandomPostfix()} UPD`,
        updatedRoleDescription: `Description C436929 ${getRandomPostfix()} UPD`,
        originalCapabilitySets: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Procedural',
            resource: 'UI-Notes Item Assign-Unassign',
            action: 'Execute',
          },
        ],
        originalCapabilitiesInSets: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar Endpoint Calendars',
            action: 'View',
          },
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar Endpoint Calendars CalendarId',
            action: 'View',
          },
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar Endpoint Dates',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Note Links Collection',
            action: 'Edit',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Note Types Collection',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Note Types Item',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Notes Collection',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Notes Collection By Status',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Notes Domain',
            action: 'Manage',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Notes Item',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'UI-Notes Item',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Settings',
            resource: 'Module Notes Enabled',
            action: 'View',
          },
        ],
        originalCapabilities: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Owners Item',
            action: 'Create',
          },
          {
            application: 'app-platform-minimal',
            table: 'Procedural',
            resource: 'Roles Collection',
            action: 'Execute',
          },
        ],
        newCapabilitySet: {
          application: 'app-platform-minimal',
          table: 'Settings',
          resource: 'UI-Tags Settings',
          action: 'View',
        },
        newCapabilitiesInSet: [
          {
            application: 'app-platform-minimal',
            table: 'Settings',
            resource: 'Settings Tags Enabled',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'Configuration Entries Collection',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Settings',
            resource: 'Settings Tags Enabled',
            action: 'View',
          },
        ],
        expectedCounts: {
          capabilitySets: {
            Settings: 1,
            Procedural: 1,
          },
        },
        absentCapabilitySetTable: 'Data',
        capabSetIds: [],
        capabIds: [],
      };

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
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

      before('Assign capabilities, login', () => {
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
        'C436929 Editing existing authorization role (not updating capabilities)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.originalCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });

          AuthorizationRoles.openForEdit();
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.originalCapabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.originalCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedRoleName,
            testData.updatedRoleDescription,
          );
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.originalCapabilitySets[0], false);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.newCapabilitySet);
          cy.wait(2000);
          cy.intercept('PUT', `/roles/${testData.roleId}`).as('roleCall');
          cy.intercept('PUT', `/roles/${testData.roleId}/capability-sets`).as('capabilitySetsCall');
          AuthorizationRoles.clickSaveButton();

          cy.wait('@roleCall').then((call) => {
            expect(call.response.statusCode).to.eq(204);
            expect(call.request.body.name).to.eq(testData.updatedRoleName);
            expect(call.request.body.description).to.eq(testData.updatedRoleDescription);
          });
          cy.wait('@capabilitySetsCall').then((call) => {
            expect(call.response.statusCode).to.eq(204);
            expect(call.request.body.capabilitySetIds).to.have.lengthOf(2);
          });
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('2');
          AuthorizationRoles.checkCapabilitiesAccordionCounter('14');
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.originalCapabilitySets[1]);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          Object.entries(testData.expectedCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapablitySets(table, count);
          });
          AuthorizationRoles.verifyCapabilitySetTableAbsent(testData.absentCapabilitySetTable);
        },
      );
    });
  });
});
