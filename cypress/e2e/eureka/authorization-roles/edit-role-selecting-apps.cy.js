import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import {
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
  APPLICATION_NAMES,
} from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe(CAPABILITY_TYPES.SETTINGS, () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C430265 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        updatedRoleName: `Auto Role C430265 ${getRandomPostfix()} UPD`,
        updateRoleDescription: `Description ${getRandomPostfix()} UPD`,
        originalApplications: ['app-acquisitions', 'app-platform-complete'],
        newApplication: 'app-platform-minimal',
        originalCapabilities: [
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Orders Item Approve',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Data-Export Export',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        expectedRowCounts: {
          capabilities: {
            Procedural: 1,
          },
        },
        absentCapabilityTables: [CAPABILITY_TYPES.DATA, CAPABILITY_TYPES.SETTINGS],
        capabIds: [],
      };

      const capabilityCallRegExp = new RegExp(
        `\\/capabilities\\?limit=\\d{1,}&query=applicationId==\\(${testData.originalApplications[1]}-.{1,}or.{1,}${testData.newApplication}-.{1,}\\)`,
      );

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
      ];

      before('Create role, user', () => {
        cy.clearCookies({ domain: null });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
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
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            SETTINGS_SUBSECTION_AUTH_ROLES,
          );
        });
        AuthorizationRoles.waitContentLoading();
      });

      afterEach('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C430265 Selecting/deselecting applications when editing authorization role (no capabilities selected)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'C430265'] },
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
          AuthorizationRoles.verifyAppNamesInCapabilityTables([
            testData.originalApplications[1],
            testData.newApplication,
          ]);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName,
            testData.updateRoleDescription,
          );
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
          testData.absentCapabilityTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilityTableAbsent(table);
          });
        },
      );
    });
  });
});
