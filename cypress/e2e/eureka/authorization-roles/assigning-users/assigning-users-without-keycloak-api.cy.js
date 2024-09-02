import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      describe('Assigning users', () => {
        const userIds = [];
        const testData = {
          userBody: {
            type: 'staff',
            active: true,
            personal: {
              lastName: `User C451622 ${getRandomPostfix()}`,
              email: 'testuser@test.org',
              preferredContactTypeId: '002',
            },
          },
          roleName: `Role C451622 ${getRandomPostfix()}`,
          noUsernameErrorMessage: 'User without username cannot be created in Keycloak',
        };
        const userA = { ...testData.userBody };
        const userB = { ...testData.userBody };
        const userC = { ...testData.userBody };
        userA.username = `userac451622${getRandomPostfix()}`;
        userC.username = `usercc451622${getRandomPostfix()}`;

        before('Create data', () => {
          cy.getAdminToken();
          cy.getUserGroups().then((groupId) => {
            userA.patronGroup = groupId;
            userB.patronGroup = groupId;
            userC.patronGroup = groupId;
            cy.createUserWithoutKeycloakInEurekaApi(userA).then((userId) => {
              testData.userAId = userId;
              userIds.push(userId);
            });
            cy.createUserWithoutKeycloakInEurekaApi(userB).then((userId) => {
              testData.userBId = userId;
              userIds.push(userId);
            });
            Users.createViaApi(userC).then((user) => {
              testData.userCId = user.id;
              userIds.push(user.id);
            });
            cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
              testData.roleId = role.id;
              cy.getCapabilitiesApi(2).then((capabs) => {
                cy.getCapabilitySetsApi(2).then((capabSets) => {
                  cy.addCapabilitiesToNewRoleApi(
                    testData.roleId,
                    capabs.map((capab) => capab.id),
                  );
                  cy.addCapabilitySetsToNewRoleApi(
                    testData.roleId,
                    capabSets.map((capabSet) => capabSet.id),
                  );
                });
              });
            });
          });
        });

        after('Delete data', () => {
          cy.getAdminToken();
          userIds.forEach((id) => {
            Users.deleteViaApi(id);
          });
          userIds.forEach((id) => {
            cy.deleteUserWithoutKeycloakInEurekaApi(id);
          });
          cy.deleteAuthorizationRoleApi(testData.roleId);
        });

        it(
          'C451622 Assigning users not having Keycloak records for an existing authorization role via API (eureka)',
          { tags: ['criticalPath', 'eureka'] },
          () => {
            cy.getAdminToken();
            cy.addRolesToNewUserApi(testData.userAId, [testData.roleId]).then((response) => {
              expect(response.status).to.eq(201);
              expect(response.body.userRoles).to.have.lengthOf(1);
              expect(response.body.userRoles[0].userId).to.eq(testData.userAId);
              expect(response.body.userRoles[0].roleId).to.eq(testData.roleId);
            });
            cy.addRolesToNewUserApi(testData.userBId, [testData.roleId], true).then((response) => {
              expect(response.status).to.eq(500);
              expect(response.body.errors[0].message).to.include(testData.noUsernameErrorMessage);
            });
            cy.addRolesToNewUserApi(testData.userCId, [testData.roleId]).then((response) => {
              expect(response.status).to.eq(201);
              expect(response.body.userRoles).to.have.lengthOf(1);
              expect(response.body.userRoles[0].userId).to.eq(testData.userCId);
              expect(response.body.userRoles[0].roleId).to.eq(testData.roleId);
            });
          },
        );
      });
    });
  });
});
