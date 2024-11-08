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
        originalApplications: ['app-platform-complete', 'app-platform-minimal'],
        originalCapabilitySets: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'UI-Tags',
            action: 'View',
          },
        ],
        originalCapabilitiesInSets: [
          {
            table: 'Data',
            resource: 'Calendar Endpoint Calendars',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Calendars CalendarId',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Calendar Endpoint Dates',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Tags Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'UI-Tags',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Module Tags Enabled',
            action: 'View',
          },
        ],
        originalCapabilities: [
          {
            table: 'Procedural',
            resource: 'Login Event Collection',
            action: 'Execute',
          },
          {
            table: 'Procedural',
            resource: 'Login Password',
            action: 'Execute',
          },
        ],
        newCapabilitySet: {
          application: 'app-platform-minimal',
          table: 'Data',
          resource: 'UI-Notes Item',
          action: 'View',
        },
        newCapabilitiesInSet: [
          {
            table: 'Data',
            resource: 'Note Links Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Note Types Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Note Types Item',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Notes Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Notes Item',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'UI-Notes Item',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Module Notes Enabled',
            action: 'View',
          },
        ],
        expectedCounts: {
          capabilitySets: {
            Data: 2,
          },
        },
        absentCapabilitySetTables: ['Settings', 'Procedural'],
        capabSetIds: [],
        capabIds: [],
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
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

      const regExpBase = `\\?limit=\\d{1,}&query=applicationId==\\(${testData.originalApplications[1]}-.{1,}or.{1,}${testData.originalApplications[0]}-.{1,}\\)`;
      const capabilitiesCallRegExp = new RegExp(`\\/capabilities${regExpBase}`);
      const capabilitySetsCallRegExp = new RegExp(`\\/capability-sets${regExpBase}`);

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C436929 Editing existing authorization role (not updating capabilities)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'eurekaTemporaryECS', 'C436929'] },
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

          cy.intercept('GET', capabilitiesCallRegExp).as('capabilities');
          cy.intercept('GET', capabilitySetsCallRegExp).as('capabilitySets');
          AuthorizationRoles.openForEdit();
          cy.wait('@capabilities').its('response.statusCode').should('eq', 200);
          cy.wait('@capabilitySets').its('response.statusCode').should('eq', 200);
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
          cy.intercept('PUT', `/roles/${testData.roleId}/capabilities`).as('capabilitiesCall');
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
          cy.get('@capabilitiesCall.all').then((calls) => {
            expect(calls).to.have.length(0);
          });
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('2');
          AuthorizationRoles.checkCapabilitiesAccordionCounter('12');
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.originalCapabilitySets[1]);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          Object.entries(testData.expectedCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilitySetRows(table, count);
          });
          testData.absentCapabilitySetTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilitySetTableAbsent(table);
          });
        },
      );
    });
  });
});
