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
          lastName: `AT_C627444_LastName_${getRandomPostfix()}`,
          email: 'AT_C627444@test.com',
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
    userA.username = `at_c627444_username_a_${getRandomPostfix()}`;
    userB.username = `at_c627444_username_b_${getRandomPostfix()}`;
    userD.username = `at_c627444_username_d_${getRandomPostfix()}`;
    userE.username = `at_c627444_username_e_${getRandomPostfix()}`;

    before('Create data', () => {
      cy.getAdminToken();
      cy.ifConsortia(true, () => {
        userC.type = 'patron';
      });
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
            cy.getCapabilitiesForUserApi(testData.userAId, true).then(({ status }) => {
              expect(status).to.eq(404);
            });
          },
        );
        cy.addCapabilitySetsToNewUserApi(testData.userBId, testData.capabilitySetIds, true).then(
          (response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            cy.getCapabilitySetsForUserApi(testData.userBId, true).then(({ status }) => {
              expect(status).to.eq(404);
            });
          },
        );

        cy.addCapabilitiesToNewUserApi(testData.userCId, testData.capabilityIds, true).then(
          (response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            cy.getCapabilitiesForUserApi(testData.userCId, true).then(({ status }) => {
              expect(status).to.eq(404);
            });
          },
        );
        cy.addCapabilitySetsToNewUserApi(testData.userCId, testData.capabilitySetIds, true).then(
          (response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(testData.noKeycloakErrorMessage);
            cy.getCapabilitySetsForUserApi(testData.userCId, true).then(({ status }) => {
              expect(status).to.eq(404);
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
