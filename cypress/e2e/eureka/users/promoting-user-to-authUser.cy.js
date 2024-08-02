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
          lastName: `UserForPromotion ${getRandomPostfix()}`,
          email: 'testuser@test.org',
          preferredContactTypeId: '002',
        },
      },
      password: 'password',
    };
    const userA = { ...testData.userBody };
    const userB = { ...testData.userBody };
    const userC = { ...testData.userBody };
    userA.username = `userac451631${getRandomPostfix()}`;
    userC.username = `usercc451632${getRandomPostfix()}`;

    before('Create data', () => {
      Cypress.session.clearCurrentSessionData();
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
      });

      cy.getCapabilitiesApi(3).then((capabs) => {
        testData.capabIds = capabs.map((capab) => capab.id);
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
    });

    it(
      'C451631 Promoting a user without Keycloak record to AuthUser via API (eureka)',
      { tags: ['criticalPath', 'eureka'] },
      () => {
        cy.getAdminToken();
        cy.checkIfUserHasKeycloakApi(testData.userAId).then((statusCode) => {
          expect(statusCode).to.eq(404);
        });
        cy.checkIfUserHasKeycloakApi(testData.userBId).then((statusCode) => {
          expect(statusCode).to.eq(404);
        });
        cy.promoteUserToKeycloakApi(testData.userBId, true).then((statusCode) => {
          expect(statusCode).to.eq(400);
        });
        cy.promoteUserToKeycloakApi(testData.userAId).then((statusCode) => {
          expect(statusCode).to.eq(201);
          cy.addCapabilitiesToNewUserApi(testData.userAId, testData.capabIds);
          cy.setUserPassword({
            username: userA.username,
            password: testData.password,
          });
          cy.login(userA.username, testData.password);
        });
      },
    );

    it(
      'C451632 Promoting a user already having a Keycloak record to AuthUser via API (eureka)',
      { tags: ['criticalPath', 'eureka'] },
      () => {
        cy.getAdminToken();
        cy.checkIfUserHasKeycloakApi(testData.userCId).then((statusCode) => {
          expect(statusCode).to.eq(204);
        });
        cy.promoteUserToKeycloakApi(testData.userCId).then((statusCode) => {
          expect(statusCode).to.eq(204);
          cy.addCapabilitiesToNewUserApi(testData.userCId, testData.capabIds);
          cy.getCapabilitiesForUserApi(testData.userCId).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.totalRecords).to.eq(3);
          });
        });
      },
    );
  });
});
