import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C624298 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        // TO DO: rewrite using >1 original apps when more apps will be consistently available
        originalApplications: ['app-platform-complete'],
        newApplication: 'app-platform-minimal',
        originalCapabilitySets: [
          {
            application: 'app-platform-complete',
            table: 'Settings',
            resource: 'Erm Settings',
            action: 'View',
          },
        ],
        originalCapabilitiesInSets: [
          {
            table: 'Settings',
            resource: 'Erm Settings',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Erm Settings Collection',
            action: 'View',
          },
        ],
        originalCapabilities: [
          {
            table: 'Procedural',
            resource: 'Feesfines Accounts Cancel',
            action: 'Execute',
          },
          {
            table: 'Procedural',
            resource: 'Feesfines Accounts Pay',
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
            resource: 'Settings Enabled',
            action: 'View',
          },
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
            resource: 'UI-Tags Settings',
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
            table: 'Data',
            resource: 'UI-Tags',
            action: 'Edit',
          },
          {
            application: 'app-platform-minimal',
            table: 'Data',
            resource: 'UI-Tags',
            action: 'Manage',
          },
        ],
        expectedRowCounts: {
          capabilitySets: {
            Settings: 1,
          },
          capabilities: {
            Settings: 3,
            Procedural: 1,
            Data: 2,
          },
        },
        absentCapabilitySetTables: ['Data', 'Procedural'],
        capabSetIds: [],
        capabIds: [],
      };

      const regExpBase = `\\?limit=\\d{1,}&query=applicationId==\\(${testData.newApplication}-.{1,}\\)`;
      const capabilitiesCallRegExp = new RegExp(`\\/capabilities${regExpBase}`);
      const capabilitySetsCallRegExp = new RegExp(`\\/capability-sets${regExpBase}`);

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
        'C624298 Selecting/deselecting applications when editing authorization role',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'eurekaTemporaryECS', 'C624298'] },
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
          // TO DO: uncomment when "full" app will be split in multiple apps
          // AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.newApplication]);
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
          AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(testData.newCapabilities[0], 1);
          // 2 checkboxes for the same row because same resource but different actions
          AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(testData.newCapabilities[1], 2);
        },
      );
    });
  });
});
