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
        originalApplications: ['erm-usage', 'app-platform-complete'],
        newApplication: 'app-platform-minimal',
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
        expectedCounts: {
          Data: 2,
        },
        absentCapabilityTables: ['Settings', 'Procedural'],
        capabIds: [],
      };

      const capabilityCallRegExp = new RegExp(
        `\\/capabilities\\?limit=\\d{1,}&query=applicationId=${testData.originalApplications[0]}-.{1,}or.{1,}applicationId=${testData.newApplication}-.{1,}`,
      );

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
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

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C430265 Selecting/deselecting applications when editing authorization role (no capabilities selected)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
        () => {
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
          AuthorizationRoles.selectApplicationInModal(testData.originalApplications[1], false);
          AuthorizationRoles.selectApplicationInModal(testData.newApplication);
          cy.intercept('GET', capabilityCallRegExp).as('capabilities');
          AuthorizationRoles.clickSaveInModal();
          cy.wait('@capabilities').its('response.statusCode').should('eq', 200);
          AuthorizationRoles.verifyAppNamesInCapabilityTables([
            testData.originalApplications[0],
            testData.newApplication,
          ]);
          testData.originalCapabilities
            .filter((capability) => capability.application !== testData.originalApplications[1])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
            });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName,
            testData.updateRoleDescription,
          );
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.originalCapabilities
            .filter((capability) => capability.application !== testData.originalApplications[1])
            .forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });
          Object.entries(testData.expectedCounts).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapablities(table, count);
          });
          testData.absentCapabilityTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilityTableAbsent(table);
          });
        },
      );
    });
  });
});
