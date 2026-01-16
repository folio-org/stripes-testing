import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const userIds = [];
    const testData = {
      userBody: {
        type: 'staff',
        active: true,
        personal: {
          lastName: `AT_C451626_LastName_${getRandomPostfix()}`,
          email: 'AT_C451626@test.com',
          preferredContactTypeId: '002',
        },
      },
      password: 'MyComplicatedPassword123!',
      noUsernameErrorMessage: 'User without username cannot be created in Keycloak',
    };
    const userA = { ...testData.userBody };
    const userB = { ...testData.userBody };
    const userC = { ...testData.userBody };
    userA.username = `at_c451626_username_a_${getRandomPostfix()}`;
    userC.username = `at_c451626_username_c_${getRandomPostfix()}`;

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
      });
    });

    after('Delete data', () => {
      cy.getAdminToken();
      userIds.forEach((id) => {
        Users.deleteViaApi(id);
      });
    });

    it(
      'C451626 Creating credentials for a user not having a Keycloak record via API (eureka)',
      { tags: ['criticalPath', 'eureka', 'C451626'] },
      () => {
        cy.getAdminToken();
        cy.setUserPassword({
          username: userA.username,
          userId: testData.userAId,
          password: testData.password,
        }).then((responseA) => {
          expect(responseA.status).to.eq(201);

          cy.setUserPassword(
            {
              userId: testData.userBId,
              password: testData.password,
            },
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(500);
            expect(body.errors[0].message).to.include(testData.noUsernameErrorMessage);
          });
          cy.setUserPassword(
            {
              username: null,
              userId: testData.userBId,
              password: testData.password,
            },
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(500);
            expect(body.errors[0].message).to.include(testData.noUsernameErrorMessage);
          });

          cy.setUserPassword({
            username: userC.username,
            userId: testData.userCId,
            password: testData.password,
          }).then((responseC) => {
            expect(responseC.status).to.eq(201);

            cy.login(userA.username, testData.password);
            cy.login(userC.username, testData.password);
          });
        });
      },
    );
  });
});
