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
              lastName: `AT_C627445_LastName_${getRandomPostfix()}`,
              email: 'AT_C627445@test.com',
              preferredContactTypeId: '002',
            },
          },
          roleName: `AT_C627445_UserRole_${getRandomPostfix()}`,
          noKeycloakErrorMessage: "Keycloak user doesn't exist",
        };
        const userA = { ...testData.userBody };
        const userB = { ...testData.userBody };
        const userC = { ...testData.userBody };
        userA.username = `at_c627445_username_a_${getRandomPostfix()}`;
        userC.username = `at_c627445_username_c_${getRandomPostfix()}`;

        before('Create data', () => {
          cy.getAdminToken();
          cy.getUserGroups().then((groupId) => {
            userA.patronGroup = groupId;
            userB.patronGroup = groupId;
            userC.patronGroup = groupId;

            cy.ifConsortia(true, () => {
              userB.type = 'patron';
            });

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
          cy.deleteAuthorizationRoleApi(testData.roleId);
        });

        it(
          'C627445 Assigning users not having Keycloak records for an existing authorization role via API (eureka)',
          { tags: ['criticalPath', 'eureka', 'C627445'] },
          () => {
            cy.getAdminToken();
            cy.addRolesToNewUserApi(testData.userAId, [testData.roleId], true).then((response) => {
              expect(response.status).to.eq(404);
              expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            });

            cy.addRolesToNewUserApi(testData.userBId, [testData.roleId], true).then((response) => {
              expect(response.status).to.eq(404);
              expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
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
