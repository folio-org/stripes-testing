import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleAName: `Auto Role A ErrHand ${getRandomPostfix()}`,
        roleBName: `Auto Role B ErrHand ${getRandomPostfix()}`,
      };
      const errorJson = {
        errors: [
          {
            message:
              'JSON parse error: Cannot deserialize value of type `java.util.UUID` from String "0e3d1631-b3b8-4757-99aa-d77a7a77c44Z": Non-hex character \'Z\' (value 0x5a), not valid for UUID String',
            type: 'HttpMessageNotReadableException',
            code: 'validation_error',
          },
        ],
        total_records: 1,
      };

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.getUserGroups().then(() => {
          cy.createTempUser([]).then((createdUserProperties) => {
            testData.tempUser = createdUserProperties;
            cy.createTempUser([]).then((createdUserAProperties) => {
              testData.userA = createdUserAProperties;
              cy.createTempUser([]).then((createdUserBProperties) => {
                testData.userB = createdUserBProperties;
                cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
                  testData.roleAId = role.id;
                });
                cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
                  testData.roleBId = role.id;
                  // TO DO: rewrite when users will not have admin role assigned upon creation
                  cy.deleteRolesForUserApi(testData.userA.userId);
                  cy.updateRolesForUserApi(testData.userB.userId, [testData.roleBId]);
                  cy.login(testData.tempUser.username, testData.tempUser.password, {
                    path: TopMenu.settingsAuthorizationRoles,
                    waiter: AuthorizationRoles.waitContentLoading,
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
        Users.deleteViaApi(testData.tempUser.userId);
      });

      it('UIROLES-53 Roles assignment error handling in UI (eureka)', { tags: [] }, () => {
        cy.intercept('POST', '/roles/users', {
          statusCode: 400,
          body: errorJson,
        }).as('usersPost');
        cy.intercept('PUT', '/roles/users/*').as('usersPut');

        AuthorizationRoles.searchRole(testData.roleAName);
        cy.wait(1000);
        AuthorizationRoles.clickOnRoleName(testData.roleAName);
        AuthorizationRoles.clickAssignUsersButton();
        cy.wait(1000);
        AuthorizationRoles.selectUserInModal(testData.userA.username);
        cy.wait(1000);
        AuthorizationRoles.selectUserInModal(testData.userB.username);
        cy.wait(1000);
        AuthorizationRoles.clickSaveInAssignModal();
        cy.wait(1000);
        cy.wait('@usersPost').its('response.statusCode').should('eq', 400);
        cy.wait('@usersPut').its('response.statusCode').should('eq', 204);
        AuthorizationRoles.checkUsersAccordion(1);
      });
    });
  });
});
