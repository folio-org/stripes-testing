import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { calloutTypes } from '../../../../interactors';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Original role C624301 ${getRandomPostfix()}`,
        calloutText: 'error while duplicating',
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
            cy.getCapabilitiesApi(2).then((capabs) => {
              cy.getCapabilitySetsApi(2).then((capabSets) => {
                cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
                  testData.roleId = roleId;
                  cy.addCapabilitiesToNewRoleApi(
                    roleId,
                    capabs.map((capab) => capab.id),
                  );
                  cy.addCapabilitySetsToNewRoleApi(
                    roleId,
                    capabSets.map((capab) => capab.id),
                  );
                  cy.addRolesToNewUserApi(createdUserProperties.userId, [roleId]);
                });
              });
            });
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C624301 Eureka | User with insufficient capabilities can not duplicate an authorization role (thunderjet)',
        { tags: ['extendedPath', 'thunderjet', 'eureka', 'C624301'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName, false);
          AuthorizationRoles.clickActionsButton();
          // TO DO: uncomment the next line after UIROLES-112 and UIROLES-58 implementation
          // AuthorizationRoles.checkDuplicateOptionShown(false);
          AuthorizationRoles.clickDuplicateButton();
          AuthorizationRoles.confirmDuplicateRole();
          InteractorsTools.checkCalloutContainsMessage(testData.calloutText, calloutTypes.error);
        },
      );
    });
  });
});
