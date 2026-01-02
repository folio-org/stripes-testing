import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const randomPostfix = getRandomPostfix();
    const userBodies = [];
    const userIds = [];
    const testData = {
      oldPassword: 'password',
      newPassword: 'MyComplicatedPassword123!',
      invalidUsername: 'nonexistentusername123',
      notFoundErrorMessage: 'Failed to find user by name: username = ',
      noUsernameErrorMessage: 'User without username cannot be created in Keycloak',
    };

    before('Create data', () => {
      cy.getAdminToken();
      cy.getUserGroups().then(() => {
        for (let i = 1; i < 5; i++) {
          userBodies.push({
            type: 'staff',
            active: true,
            username: `at_c594518_${i}_${randomPostfix}`,
            patronGroup: Cypress.env('userGroups')[0].id,
            personal: {
              lastName: `AT_C594518_LastName_${i}_${randomPostfix}`,
              email: 'AT_C594518@test.com',
              preferredContactTypeId: '002',
            },
          });
        }
        cy.ifConsortia(false, () => {
          delete userBodies[2].username;
        });
        userBodies.forEach((userBody, index) => {
          if (index < 3) {
            cy.createUserWithoutKeycloakInEurekaApi(userBody).then((userId) => {
              userIds.push(userId);
            });
          } else {
            Users.createViaApi(userBody).then((user) => {
              userIds.push(user.id);
            });
          }
        });
      });
    });

    after('Delete data', () => {
      cy.getAdminToken();
      userIds.forEach((id) => {
        Users.deleteViaApi(id);
      });
    });

    it(
      'C594518 Updating credentials using /authn/update for users with/without Keycloak record via API (eureka)',
      { tags: ['criticalPath', 'eureka', 'C594518'] },
      () => {
        cy.then(() => {
          cy.getAdminToken();
          cy.updateCredentials(
            userBodies[0].username,
            testData.oldPassword,
            testData.newPassword,
          ).then(({ status }) => {
            expect(status).to.eq(204);
            cy.checkIfUserHasKeycloakApi(userIds[0]).then((response) => {
              expect(response.status).to.eq(204);
            });
          });
          cy.updateCredentials(
            userBodies[1].username,
            testData.oldPassword,
            testData.newPassword,
            userIds[1],
          ).then(({ status }) => {
            expect(status).to.eq(204);
            cy.checkIfUserHasKeycloakApi(userIds[1]).then((response) => {
              expect(response.status).to.eq(204);
            });
          });
          cy.updateCredentials(
            testData.invalidUsername,
            testData.oldPassword,
            testData.newPassword,
          ).then(({ status, body }) => {
            expect(status).to.eq(404);
            expect(body.errors[0].message).to.include(
              testData.notFoundErrorMessage + testData.invalidUsername,
            );
          });

          cy.ifConsortia(false, () => {
            cy.updateCredentials(
              testData.invalidUsername,
              testData.oldPassword,
              testData.newPassword,
              userIds[2],
            ).then(({ status, body }) => {
              expect(status).to.eq(500);
              expect(body.errors[0].message).to.include(testData.noUsernameErrorMessage);
            });
          });

          cy.updateCredentials(
            userBodies[3].username,
            testData.oldPassword,
            testData.newPassword,
            userIds[3],
          ).then(({ status }) => {
            expect(status).to.eq(204);
          });
        }).then(() => {
          cy.login(userBodies[0].username, testData.newPassword);
          cy.login(userBodies[3].username, testData.newPassword);
        });
      },
    );
  });
});
