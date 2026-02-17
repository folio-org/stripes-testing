import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C423959_UserRole_${getRandomPostfix()}`,
        capabilitySetColumnsToSelect: [
          {
            type: CAPABILITY_TYPES.DATA,
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            action: CAPABILITY_ACTIONS.CREATE,
          },
        ],
        capabilityColumnsToSelect: [
          {
            type: CAPABILITY_TYPES.PROCEDURAL,
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
      };

      const capabSetsForTestUser = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
      ];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsForTestUser);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C423959 Capabilities, capability sets sorting when creating new authorization role (eureka)',
        { tags: ['extendedPath', 'eureka', 'C423959'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();

          AuthorizationRoles.fillRoleNameDescription(testData.roleName);

          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectAllApplicationsInModal();
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.waitCapabilitiesShown();
          AuthorizationRoles.verifyHeadersForCapabilityTables();
          AuthorizationRoles.verifyCapabilityRowsSortedInMultipleTables();

          testData.capabilityColumnsToSelect.forEach((column) => {
            AuthorizationRoles.selectCapabilityColumn(column.type, column.action);
            cy.wait(10);
          });

          testData.capabilitySetColumnsToSelect.forEach((column) => {
            AuthorizationRoles.selectCapabilitySetColumn(column.type, column.action);
            cy.wait(10);
          });
          // wait for selections for included capabilities to apply
          cy.wait(2000);

          cy.intercept('POST', '/roles/capabilities*').as('capabilitiesCall');
          cy.intercept('POST', '/roles/capability-sets*').as('capabilitySetsCall');
          AuthorizationRoles.clickSaveButton();
          cy.then(() => {
            cy.wait('@capabilitiesCall', { timeout: 120_000 })
              .its('response.statusCode')
              .should('eq', 201);
            cy.wait('@capabilitySetsCall', { timeout: 120_000 })
              .its('response.statusCode')
              .should('eq', 201);
          }).then(() => {
            AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
            AuthorizationRoles.verifyRoleViewPane(testData.roleName);
            AuthorizationRoles.clickOnCapabilitySetsAccordion();
            AuthorizationRoles.clickOnCapabilitiesAccordion();
            AuthorizationRoles.verifyHeadersForCapabilityTables({
              capabilitySetTableNames: testData.capabilitySetColumnsToSelect.map(
                (column) => column.type,
              ),
              capabilityTableNames: Object.values(CAPABILITY_TYPES),
            });
            AuthorizationRoles.verifyCapabilityRowsSortedInMultipleTables({
              capabilitySetTableNames: testData.capabilitySetColumnsToSelect.map(
                (column) => column.type,
              ),
              capabilityTableNames: Object.values(CAPABILITY_TYPES),
            });
          });
        },
      );
    });
  });
});
