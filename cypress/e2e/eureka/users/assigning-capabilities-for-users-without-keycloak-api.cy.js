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
          lastName: `User C451628 ${getRandomPostfix()}`,
          email: 'testuser@test.org',
          preferredContactTypeId: '002',
        },
      },
      roleName: `Role C451622 ${getRandomPostfix()}`,
    };
    const userA = { ...testData.userBody };
    const userB = { ...testData.userBody };
    userA.username = `userac451628${getRandomPostfix()}`;
    userB.username = `userbc451628${getRandomPostfix()}`;

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
      userIds.forEach((id) => {
        cy.deleteUserWithoutKeycloakInEurekaApi(id);
      });
    });

    it(
      'C451628 Assigning capabilities/sets for users not having Keycloak records via API (eureka)',
      { tags: ['criticalPath', 'eureka'] },
      () => {
        cy.getAdminToken();
        cy.addCapabilitiesToNewUserApi(testData.userAId, testData.capabilityIds).then(
          (response) => {
            expect(response.status).to.eq(201);
            cy.getCapabilitiesForUserApi(testData.userAId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(testData.capabilityIds.length);
            });
          },
        );
        cy.addCapabilitySetsToNewUserApi(testData.userBId, testData.capabilitySetIds).then(
          (response) => {
            expect(response.status).to.eq(201);
            cy.getCapabilitySetsForUserApi(testData.userBId).then(({ body, status }) => {
              expect(status).to.eq(200);
              expect(body.totalRecords).to.eq(testData.capabilitySetIds.length);
            });
          },
        );
      },
    );
  });
});
