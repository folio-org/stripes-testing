/* eslint-disable no-console */
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
      password: 'MyComplicatedPwd1$%',
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
      cy.getAdminToken();
      console.log('BEFORE block: After getting admin token');
      cy.getUserGroups().then((groupId) => {
        console.log('BEFORE block: After getting user groups');
        userA.patronGroup = groupId;
        userB.patronGroup = groupId;
        userC.patronGroup = groupId;

        cy.ifConsortia(true, () => {
          userB.type = 'patron';
        });
        console.log('BEFORE block: After ifConsortia check');

        cy.createUserWithoutKeycloakInEurekaApi(userA).then((userId) => {
          console.log('BEFORE block: After creating user A without Keycloak');
          testData.userAId = userId;
          userIds.push(userId);
        });

        cy.createUserWithoutKeycloakInEurekaApi(userB).then((userId) => {
          console.log('BEFORE block: After creating user B without Keycloak');
          testData.userBId = userId;
          userIds.push(userId);
        });

        Users.createViaApi(userC).then((user) => {
          console.log('BEFORE block: After creating user C via API');
          testData.userCId = user.id;
          userIds.push(user.id);
        });
      });

      cy.getCapabilitiesApi(3).then((capabs) => {
        console.log('BEFORE block: After getting capabilities');
        testData.capabIds = capabs.map((capab) => capab.id);
      });
    });

    after('Delete data', () => {
      cy.getAdminToken();
      console.log('AFTER block: After getting admin token');
      userIds.forEach((id) => {
        Users.deleteViaApi(id);
        console.log(`AFTER block: After deleting user ${id}`);
      });
    });

    it(
      'C451631 Promoting a user without Keycloak record to AuthUser via API (eureka)',
      { tags: ['criticalPath', 'eureka', 'C451631'] },
      () => {
        cy.getAdminToken();
        console.log('IT C451631 block: After getting admin token');
        cy.checkIfUserHasKeycloakApi(testData.userAId).then(({ status, body }) => {
          console.log('IT C451631 block: After checking if user A has Keycloak record');
          expect(status).to.eq(404);
          expect(body.errors[0].message).to.eq(testData.notFoundErrorMsg);
        });

        cy.checkIfUserHasKeycloakApi(testData.userBId).then(({ status, body }) => {
          console.log('IT C451631 block: After checking if user B has Keycloak record');
          expect(status).to.eq(404);
          expect(body.errors[0].message).to.eq(testData.notFoundErrorMsg);
        });
        cy.promoteUserToKeycloakApi(testData.userBId, true).then(({ status, body }) => {
          console.log('IT C451631 block: After promoting user B to Keycloak (expected failure)');
          expect(status).to.eq(400);
          expect(body.errors[0].message).to.eq(testData.noUsernameErrorMsg);
        });

        cy.promoteUserToKeycloakApi(testData.randomUuid, true).then(({ status, body }) => {
          console.log(
            'IT C451631 block: After promoting random UUID to Keycloak (expected failure)',
          );
          expect(status).to.eq(404);
          expect(body.errors[0].message).to.eq(testData.notFoundErrorMsg);
        });
        cy.promoteUserToKeycloakApi(testData.userAId).then(({ status }) => {
          console.log('IT C451631 block: After promoting user A to Keycloak');
          expect(status).to.eq(201);
          cy.checkIfUserHasKeycloakApi(testData.userAId).then((response) => {
            console.log('IT C451631 block: After verifying user A has Keycloak record');
            expect(response.status).to.eq(204);
          });
          cy.setUserPassword({
            username: userA.username,
            userId: testData.userAId,
            password: testData.password,
          });
          console.log('IT C451631 block: After setting user password');
          cy.login(userA.username, testData.password);
          console.log('IT C451631 block: After logging in as user A');
        });
      },
    );

    it(
      'C451632 Promoting a user already having a Keycloak record to AuthUser via API (eureka)',
      { tags: ['criticalPath', 'eureka', 'C451632'] },
      () => {
        cy.getAdminToken();
        console.log('IT C451632 block: After getting admin token');
        cy.checkIfUserHasKeycloakApi(testData.userCId).then(({ status }) => {
          console.log('IT C451632 block: After checking if user C has Keycloak record');
          expect(status).to.eq(204);
        });
        cy.promoteUserToKeycloakApi(testData.userCId).then(({ status }) => {
          console.log('IT C451632 block: After promoting user C to Keycloak');
          expect(status).to.eq(204);
          cy.addCapabilitiesToNewUserApi(testData.userCId, testData.capabIds);
          console.log('IT C451632 block: After adding capabilities to user C');
          cy.getCapabilitiesForUserApi(testData.userCId).then((response) => {
            console.log('IT C451632 block: After getting capabilities for user C');
            expect(response.status).to.eq(200);
            expect(response.body.totalRecords).to.eq(3);
          });
        });
      },
    );
  });
});
