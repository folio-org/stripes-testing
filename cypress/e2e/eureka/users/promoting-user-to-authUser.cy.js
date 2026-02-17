import uuid from 'uuid';
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
          lastName: `AT_C451631_LastName_${getRandomPostfix()}`,
          email: 'AT_C451631@test.com',
          preferredContactTypeId: '002',
        },
      },
      password: 'password',
      notFoundErrorMsg: 'Not Found',
      noUsernameErrorMsg: 'User without username cannot be created in Keycloak',
      randomUuid: uuid(),
    };
    const userA = { ...testData.userBody };
    const userB = { ...testData.userBody };
    const userC = { ...testData.userBody };
    userA.username = `at_c451631_username_a_${getRandomPostfix()}`;
    userC.username = `at_c451631_username_c_${getRandomPostfix()}`;

    before('Create data', () => {
      Cypress.session.clearCurrentSessionData();
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

      cy.getCapabilitiesApi(3).then((capabs) => {
        testData.capabIds = capabs.map((capab) => capab.id);
      });
    });

    after('Delete data', () => {
      cy.getAdminToken();
      userIds.forEach((id) => {
        Users.deleteViaApi(id);
      });
    });

    it(
      'C451631 Promoting a user without Keycloak record to AuthUser via API (eureka)',
      { tags: ['criticalPath', 'eureka', 'C451631'] },
      () => {
        cy.getAdminToken();
        cy.checkIfUserHasKeycloakApi(testData.userAId).then(({ status, body }) => {
          expect(status).to.eq(404);
          expect(body.errors[0].message).to.eq(testData.notFoundErrorMsg);
        });

        cy.checkIfUserHasKeycloakApi(testData.userBId).then(({ status, body }) => {
          expect(status).to.eq(404);
          expect(body.errors[0].message).to.eq(testData.notFoundErrorMsg);
        });
        cy.promoteUserToKeycloakApi(testData.userBId, true).then(({ status, body }) => {
          expect(status).to.eq(400);
          expect(body.errors[0].message).to.eq(testData.noUsernameErrorMsg);
        });

        cy.promoteUserToKeycloakApi(testData.randomUuid, true).then(({ status, body }) => {
          expect(status).to.eq(404);
          expect(body.errors[0].message).to.eq(testData.notFoundErrorMsg);
        });
        cy.promoteUserToKeycloakApi(testData.userAId).then(({ status }) => {
          expect(status).to.eq(201);
          cy.checkIfUserHasKeycloakApi(testData.userAId).then((response) => {
            expect(response.status).to.eq(204);
          });
          cy.setUserPassword({
            username: userA.username,
            userId: testData.userAId,
            password: testData.password,
          });
          cy.login(userA.username, testData.password);
        });
      },
    );

    it(
      'C451632 Promoting a user already having a Keycloak record to AuthUser via API (eureka)',
      { tags: ['criticalPath', 'eureka', 'C451632'] },
      () => {
        cy.getAdminToken();
        cy.checkIfUserHasKeycloakApi(testData.userCId).then(({ status }) => {
          expect(status).to.eq(204);
        });
        cy.promoteUserToKeycloakApi(testData.userCId).then(({ status }) => {
          expect(status).to.eq(204);
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
