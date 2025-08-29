import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleAName: `Auto Role A ErrHand ${getRandomPostfix()}`,
        roleBName: `Auto Role B ErrHand ${getRandomPostfix()}`,
        postErrorMessage: 'POST request failed: unknown reason',
        putErrorMessage1: 'PUT request failed: user NOT found',
        putErrorMessage2: 'PUT request failed: timeout error',
        deleteErrorMessage1: 'DELETE request failed: invalid query',
        deleteErrorMessage2: 'DELETE request failed: system error',
        errorCalloutType: 'error',
      };
      function getErrorJson(message) {
        return {
          errors: [{ message }],
          total_records: 1,
        };
      }
      function getTwoErrorsJson(message1, message2) {
        return {
          errors: [{ message: message1 }, { message: message2 }],
          total_records: 2,
        };
      }
      const errorJsonPost = getErrorJson(testData.postErrorMessage);
      const errorJsonPut = getTwoErrorsJson(testData.putErrorMessage1, testData.putErrorMessage2);
      const errorJsonDelete1 = getErrorJson(testData.deleteErrorMessage1);
      const errorJsonDelete2 = getErrorJson(testData.deleteErrorMessage2);

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.getUserGroups().then(() => {
          cy.createTempUser([]).then((createdUserAProperties) => {
            testData.userA = createdUserAProperties;
            cy.createTempUser([]).then((createdUserBProperties) => {
              testData.userB = createdUserBProperties;
              cy.createTempUser([]).then((createdUserCProperties) => {
                testData.userC = createdUserCProperties;
                cy.createTempUser([]).then((createdUserDProperties) => {
                  testData.userD = createdUserDProperties;
                  cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
                    testData.roleAId = role.id;
                  });
                  cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
                    testData.roleBId = role.id;
                    if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);
                    if (Cypress.env('runAsAdmin')) {
                      cy.updateRolesForUserApi(testData.userB.userId, [testData.roleBId]);
                      cy.updateRolesForUserApi(testData.userC.userId, [testData.roleBId]);
                      cy.updateRolesForUserApi(testData.userD.userId, [testData.roleBId]);
                    } else {
                      cy.addRolesToNewUserApi(testData.userB.userId, [testData.roleBId]);
                      cy.addRolesToNewUserApi(testData.userC.userId, [testData.roleBId]);
                      cy.addRolesToNewUserApi(testData.userD.userId, [testData.roleBId]);
                    }
                    cy.waitForAuthRefresh(() => {
                      cy.loginAsAdmin();
                      TopMenuNavigation.openAppFromDropdown(
                        APPLICATION_NAMES.SETTINGS,
                        SETTINGS_SUBSECTION_AUTH_ROLES,
                      );
                      AuthorizationRoles.waitContentLoading();
                      cy.reload();
                      AuthorizationRoles.waitContentLoading();
                    }, 20_000);
                  });
                });
              });
            });
          });
        });
      });

      after('Delete roles, users', () => {
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(testData.roleAId);
        cy.deleteAuthorizationRoleApi(testData.roleBId);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
      });

      it(
        'C491278 Error toast notifications shown upon errors when assigning/unassigning users for roles (eureka)',
        { tags: ['extendedPath', 'eureka', 'eurekaPhase1', 'C491278'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleAName);
          AuthorizationRoles.clickOnRoleName(testData.roleAName);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.userA.username);
          AuthorizationRoles.selectUserInModal(testData.userB.username);
          cy.intercept('POST', '/roles/users', {
            statusCode: 400,
            body: errorJsonPost,
          }).as('usersPost');
          cy.intercept('PUT', '/roles/users/*', {
            statusCode: 404,
            body: errorJsonPut,
          }).as('usersPut');
          AuthorizationRoles.clickSaveInAssignModal();
          cy.wait('@usersPost').its('response.statusCode').should('eq', 400);
          cy.wait('@usersPut').its('response.statusCode').should('eq', 404);
          InteractorsTools.checkCalloutExists(testData.postErrorMessage, testData.errorCalloutType);
          InteractorsTools.checkCalloutExists(testData.putErrorMessage1, testData.errorCalloutType);
          InteractorsTools.checkCalloutExists(testData.putErrorMessage2, testData.errorCalloutType);

          AuthorizationRoles.searchRole(testData.roleBName);
          AuthorizationRoles.clickOnRoleName(testData.roleBName);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.userB.username, false);
          AuthorizationRoles.selectUserInModal(testData.userC.username, false);
          AuthorizationRoles.selectUserInModal(testData.userD.username, false);
          cy.intercept('DELETE', `/roles/users/${testData.userC.userId}`, {
            statusCode: 422,
            body: errorJsonDelete1,
          }).as('usersDeleteC');
          cy.intercept('DELETE', `/roles/users/${testData.userB.userId}`, {
            statusCode: 501,
            body: errorJsonDelete2,
          }).as('usersDeleteB');
          cy.intercept('DELETE', `/roles/users/${testData.userD.userId}`).as('usersDeleteD');
          AuthorizationRoles.clickSaveInAssignModal();
          cy.wait('@usersDeleteC').its('response.statusCode').should('eq', 422);
          cy.wait('@usersDeleteB').its('response.statusCode').should('eq', 501);
          cy.wait('@usersDeleteD').its('response.statusCode').should('eq', 204);
          InteractorsTools.checkCalloutExists(
            testData.deleteErrorMessage1,
            testData.errorCalloutType,
          );
          InteractorsTools.checkCalloutExists(
            testData.deleteErrorMessage2,
            testData.errorCalloutType,
          );
        },
      );
    });
  });
});
