import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C430265 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        updatedRoleName: `Auto Role C430265 ${getRandomPostfix()} UPD`,
        updateRoleDescription: `Description ${getRandomPostfix()} UPD`,
        // TO DO: rewrite using >1 original apps when more apps will be consistently available
        originalApplications: ['app-platform-full'],
        newApplication: 'app-consortia',
        originalCapabilities: [
          {
            application: 'app-platform-full',
            table: 'Data',
            resource: 'Owners Item',
            action: 'Create',
          },
          {
            application: 'app-platform-full',
            table: 'Procedural',
            resource: 'Orders Item Approve',
            action: 'Execute',
          },
          {
            application: 'app-platform-full',
            table: 'Data',
            resource: 'UI-Users Perms',
            action: 'Edit',
          },
          {
            application: 'app-platform-full',
            table: 'Settings',
            resource: 'Erm Settings',
            action: 'View',
          },
        ],
        absentCapabilityTables: ['Data', 'Settings', 'Procedural'],
        capabIds: [],
      };

      const capabilityCallRegExp = new RegExp(
        `\\/capabilities\\?limit=\\d{1,}&query=\\applicationId==\\(${testData.newApplication}-.{1,}\\)`,
      );

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before('Create role, user', () => {
        cy.clearCookies({ domain: null });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi().then((role) => {
            testData.roleName = role.name;
            testData.roleId = role.id;
            testData.originalCapabilities.forEach((capability) => {
              capability.type = capability.table;
              cy.getCapabilityIdViaApi(capability).then((capabId) => {
                testData.capabIds.push(capabId);
              });
            });
          });
        });
      });

      before('Assign capabilities and login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      afterEach('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C430265 Selecting/deselecting applications when editing authorization role (no capabilities selected)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'eurekaTemporaryECS', 'C430265'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          AuthorizationRoles.openForEdit();
          testData.originalCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedRoleName,
            testData.updateRoleDescription,
          );
          AuthorizationRoles.checkSaveButton(true);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.originalApplications[0], false);
          AuthorizationRoles.selectApplicationInModal(testData.newApplication);
          cy.wait(1000);
          cy.intercept('GET', capabilityCallRegExp).as('capabilities');
          AuthorizationRoles.clickSaveInModal();
          cy.wait('@capabilities').its('response.statusCode').should('eq', 200);
          cy.wait(3000);
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.newApplication]);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName,
            testData.updateRoleDescription,
          );
          AuthorizationRoles.clickOnCapabilitiesAccordion(false);
          testData.absentCapabilityTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilityTableAbsent(table);
          });
        },
      );
    });
  });
});
