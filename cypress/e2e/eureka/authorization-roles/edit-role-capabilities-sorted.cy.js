import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        roleName: `AT_C423964_UserRole_${randomPostfix}`,
        updatedRoleName: `AT_C423964_UserRole_${randomPostfix} UPD`,
        capabilitySetColumnsToAssign: [
          {
            type: CAPABILITY_TYPES.DATA,
            action: CAPABILITY_ACTIONS.CREATE,
          },
          {
            type: CAPABILITY_TYPES.PROCEDURAL,
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        capabSetIds: [],
      };

      const capabSetsForTestUser = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
      ];

      const capabilityCallRegExp = /\/capabilities\?.*query=applicationId.*/;
      const capabilitySetCallRegExp = /\/capability-sets\?.*query=applicationId.*/;

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsForTestUser);

          cy.createAuthorizationRoleApi(testData.roleName, '').then((role) => {
            testData.roleId = role.id;

            cy.then(() => {
              testData.capabilitySetColumnsToAssign.forEach((column) => {
                cy.getCapabilitySetsApi(2000, {
                  query: `type=="${column.type.toUpperCase()}" and action=="${column.action.toUpperCase()}"`,
                }).then((sets) => {
                  testData.capabSetIds.push(...sets.map((capab) => capab.id));
                });
              });
            })
              .then(() => {
                cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
              })
              .then(() => {
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.settingsAuthorizationRoles,
                  waiter: AuthorizationRoles.waitContentLoading,
                });
              });
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C423964 Capabilities sorting when viewing/editing existing authorization role (eureka)',
        { tags: ['extendedPath', 'eureka', 'C423964'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);

          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          AuthorizationRoles.verifyHeadersForCapabilityTables({
            capabilitySetTableNames: testData.capabilitySetColumnsToAssign.map(
              (column) => column.type,
            ),
            capabilityTableNames: Object.values(CAPABILITY_TYPES),
          });
          AuthorizationRoles.verifyCapabilityRowsSortedInMultipleTables({
            capabilitySetTableNames: testData.capabilitySetColumnsToAssign.map(
              (column) => column.type,
            ),
            capabilityTableNames: Object.values(CAPABILITY_TYPES),
          });

          cy.intercept('GET', capabilityCallRegExp).as('getCapabilities');
          cy.intercept('GET', capabilitySetCallRegExp).as('getCapabilitySets');
          AuthorizationRoles.openForEdit();
          cy.wait('@getCapabilities').its('response.statusCode').should('eq', 200);
          cy.wait('@getCapabilitySets').its('response.statusCode').should('eq', 200);
          AuthorizationRoles.waitCapabilitiesShown();
          AuthorizationRoles.verifyHeadersForCapabilityTables();
          AuthorizationRoles.verifyCapabilityRowsSortedInMultipleTables();

          AuthorizationRoles.fillRoleNameDescription(testData.updatedRoleName);

          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.updatedRoleName);
          AuthorizationRoles.verifyRoleViewPane(testData.updatedRoleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          AuthorizationRoles.verifyHeadersForCapabilityTables({
            capabilitySetTableNames: testData.capabilitySetColumnsToAssign.map(
              (column) => column.type,
            ),
            capabilityTableNames: Object.values(CAPABILITY_TYPES),
          });
          AuthorizationRoles.verifyCapabilityRowsSortedInMultipleTables({
            capabilitySetTableNames: testData.capabilitySetColumnsToAssign.map(
              (column) => column.type,
            ),
            capabilityTableNames: Object.values(CAPABILITY_TYPES),
          });
        },
      );
    });
  });
});
