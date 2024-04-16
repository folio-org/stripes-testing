import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C430262 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        originalApplications: ['erm-usage', 'app-platform-complete'],
        newApplication: 'app-platform-minimal',
        originalCapabilitySets: [
          {
            application: 'app-platform-complete',
            table: 'Data',
            resource: 'Calendar',
            action: 'View',
          },
          {
            application: 'erm-usagee',
            table: 'Data',
            resource: 'Ermusageharvester Readonly',
            action: 'View',
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
            application: 'erm-usage',
            table: 'Data',
            resource: 'Ermusageharvester Impl',
            action: 'View',
          },
          {
            application: 'erm-usage',
            table: 'Data',
            resource: 'Ermusageharvester Periodic',
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
            application: 'app-platform-complete',
            table: 'Procedural',
            resource: 'Orders Item Approve',
            action: 'Execute',
          },
          {
            application: 'erm-usage',
            table: 'Data',
            resource: 'Erm-Usage Files Item',
            action: 'Delete',
          },
          {
            application: 'erm-usage',
            table: 'Data',
            resource: 'Customreports Collection',
            action: 'View',
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
            resource: 'Settings Enabled',
            action: 'View',
          },
          {
            application: 'app-platform-minimal',
            table: 'Settings',
            resource: 'Settings Tags Enabled',
            action: 'View',
          },
        ],
        newCapabilities: [
          {
            application: 'app-platform-minimal',
            table: 'Procedural',
            resource: 'Login Password',
            action: 'Execute',
          },
          {
            application: 'app-platform-minimal',
            table: 'Settings',
            resource: 'Module Notes Enabled',
            action: 'View',
          },
        ],
        expectedCounts: {
          capabilitySets: {
            Data: 1,
            Settings: 1,
          },
          capabilities: {
            Data: 5,
            Settings: 3,
            Procedural: 1,
          },
        },
        absentCapabilitySetTable: 'Procedural',
        capabSetIds: [],
        capabIds: [],
      };

      const regExpBase = `\\?limit=\\d{1,}&query=applicationId=${testData.originalApplications[0]}-.{1,}or.{1,}applicationId=${testData.newApplication}-.{1,}`;
      const capabilitiesCallRegExp = new RegExp(`\\/capabilities${regExpBase}`);
      const capabilitySetsCallRegExp = new RegExp(`\\/capability-sets${regExpBase}`);

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
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C430262 Selecting/deselecting applications when editing authorization role',
        { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
        () => {
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
          AuthorizationRoles.selectApplicationInModal(testData.originalApplications[1], false);
          AuthorizationRoles.selectApplicationInModal(testData.newApplication);
          cy.intercept('GET', capabilitiesCallRegExp).as('capabilities');
          cy.intercept('GET', capabilitySetsCallRegExp).as('capabilitySets');
          AuthorizationRoles.clickSaveInModal();
          cy.wait('@capabilities').its('response.statusCode').should('eq', 200);
          cy.wait('@capabilitySets').its('response.statusCode').should('eq', 200);
          AuthorizationRoles.verifyAppNamesInCapabilityTables([
            testData.originalApplications[0],
            testData.newApplication,
          ]);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.newCapabilitySet);
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          testData.originalCapabilitySets
            .filter(
              (capabilitySet) => capabilitySet.application !== testData.originalApplications[1],
            )
            .forEach((capabilitySet) => {
              AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
            });
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.originalCapabilitiesInSets
            .filter((capability) => capability.application !== testData.originalApplications[1])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });
          testData.originalCapabilities
            .filter((capability) => capability.application !== testData.originalApplications[1])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
            });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.newCapabilitySet);
          testData.originalCapabilitySets
            .filter(
              (capabilitySet) => capabilitySet.application !== testData.originalApplications[1],
            )
            .forEach((capabilitySet) => {
              AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
            });
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.originalCapabilities
            .filter((capability) => capability.application !== testData.originalApplications[1])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });
          testData.originalCapabilitiesInSets
            .filter((capability) => capability.application !== testData.originalApplications[1])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });
          testData.newCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.newCapabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });

          Object.entries(testData.expectedCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapablitySets(table, count);
          });
          AuthorizationRoles.verifyCapabilitySetTableAbsent(testData.absentCapabilitySetTable);
          Object.entries(testData.expectedCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapablities(table, count);
          });
        },
      );
    });
  });
});
