import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C496128 ${getRandomPostfix()}`,
        // TO DO: rewrite using >1 original apps when more apps will be consistently available
        originalApplications: ['app-platform-minimal'],
        newApplication: 'app-platform-complete',
        originalCapabilitySets: [
          {
            table: 'Settings',
            resource: 'Settings Authorization-Policies Enabled',
            action: 'View',
          },
          {
            table: 'Settings',
            resource: 'Settings Authorization-Roles Enabled',
            action: 'View',
          },
        ],
        originalCapabilitiesInSets: [
          {
            table: 'Settings',
            resource: 'Settings Enabled',
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
          table: 'Data',
          resource: 'Licenses Contacts',
          action: 'View',
        },
        newCapabilitiesInSet: [
          {
            table: 'Data',
            resource: 'Licenses Contacts Collection',
            action: 'View',
          },
          {
            table: 'Data',
            resource: 'Licenses Contacts Item',
            action: 'View',
          },
        ],
        newCapabilities: [
          {
            table: 'Procedural',
            resource: 'UI-Users Override Item Block',
            action: 'Execute',
          },
          {
            table: 'Procedural',
            resource: 'UI-Users Override Patron Block',
            action: 'Execute',
          },
        ],
        expectedRowCounts: {
          capabilitySets: {
            Data: 1,
            Settings: 2,
          },
          capabilities: {
            Data: 2,
            Settings: 1,
            Procedural: 4,
          },
        },
        absentCapabilitySetTable: 'Procedural',
        capabSetIds: [],
        capabIds: [],
      };

      testData.originalCapabilitySets.forEach((set) => {
        set.application = testData.originalApplications[0];
      });
      testData.originalCapabilitiesInSets.forEach((capab) => {
        capab.application = testData.originalApplications[0];
      });
      testData.originalCapabilities.forEach((capab) => {
        capab.application = testData.originalApplications[0];
      });
      testData.newCapabilitySet.application = testData.newApplication;
      testData.newCapabilitiesInSet.forEach((capab) => {
        capab.application = testData.newApplication;
      });
      testData.newCapabilities.forEach((capab) => {
        capab.application = testData.newApplication;
      });

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
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
        'C496128 Adding application when editing authorization role',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
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
          AuthorizationRoles.verifyCapabilitySetTableAbsent(testData.absentCapabilitySetTable);
          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
        },
      );
    });
  });
});