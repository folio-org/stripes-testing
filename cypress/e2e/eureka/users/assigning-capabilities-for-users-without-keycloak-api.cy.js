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
          lastName: `User C627444 ${getRandomPostfix()}`,
          email: 'testuser@test.org',
          preferredContactTypeId: '002',
        },
      },
      noKeycloakErrorMessage: "Keycloak user doesn't exist",
    };
    const userA = { ...testData.userBody };
    const userB = { ...testData.userBody };
    const userC = { ...testData.userBody };
    const userD = { ...testData.userBody };
    const userE = { ...testData.userBody };
    userA.username = `userac627444${getRandomPostfix()}`;
    userB.username = `userbc627444${getRandomPostfix()}`;
    userD.username = `userdc627444${getRandomPostfix()}`;
    userE.username = `userec627444${getRandomPostfix()}`;

    before('Create data', () => {
      cy.getAdminToken();
      cy.getUserGroups().then((groupId) => {
        userA.patronGroup = groupId;
        userB.patronGroup = groupId;
        cy.createUserWithoutKeycloakInEurekaApi(userA).then((userId) => {
          testData.userAId = userId;
          userIds.push(userId);
        });
        cy.createUserWithoutKeycloakInEurekaApi(userB).then((userId) => {
          testData.userBId = userId;
          userIds.push(userId);
        });
        cy.createUserWithoutKeycloakInEurekaApi(userC).then((userId) => {
          testData.userCId = userId;
          userIds.push(userId);
        });
        Users.createViaApi(userD).then((user) => {
          testData.userDId = user.id;
          userIds.push(user.id);
        });
        Users.createViaApi(userE).then((user) => {
          testData.userEId = user.id;
          userIds.push(user.id);
        });
        cy.getCapabilitiesApi(4).then((capabs) => {
          cy.getCapabilitySetsApi(3).then((capabSets) => {
            testData.capabilityIds = capabs.map((capab) => capab.id);
            testData.capabilitySetIds = capabSets.map((capabSet) => capabSet.id);
          });
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
      'C627444 Assigning capabilities/sets for users not having Keycloak records via API (eureka)',
      { tags: ['criticalPath', 'eureka', 'C627444'] },
      () => {
        cy.getAdminToken();
        cy.addCapabilitiesToNewUserApi(testData.userAId, testData.capabilityIds, true).then(
          (response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            cy.getCapabilitiesForUserApi(testData.userAId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(0);
            });
          },
        );
        cy.addCapabilitySetsToNewUserApi(testData.userBId, testData.capabilitySetIds, true).then(
          (response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            cy.getCapabilitySetsForUserApi(testData.userBId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(0);
            });
          },
        );

        cy.addCapabilitiesToNewUserApi(testData.userCId, testData.capabilityIds, true).then(
          (response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            cy.getCapabilitiesForUserApi(testData.userCId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(0);
            });
          },
        );
        cy.addCapabilitySetsToNewUserApi(testData.userCId, testData.capabilitySetIds, true).then(
          (response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            cy.getCapabilitySetsForUserApi(testData.userCId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(0);
            });
          },
        );

        cy.addCapabilitiesToNewUserApi(testData.userDId, testData.capabilityIds).then(
          (response) => {
            expect(response.status).to.eq(201);
            cy.getCapabilitiesForUserApi(testData.userDId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(testData.capabilityIds.length);
            });
          },
        );
        cy.addCapabilitySetsToNewUserApi(testData.userEId, testData.capabilitySetIds).then(
          (response) => {
            expect(response.status).to.eq(201);
            cy.getCapabilitySetsForUserApi(testData.userEId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(testData.capabilitySetIds.length);
            });
          },
        );
      },
    );
  });
});
