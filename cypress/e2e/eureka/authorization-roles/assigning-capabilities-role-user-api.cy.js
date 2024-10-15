import Users from '../../../support/fragments/users/users';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        capabIds: [],
        capabSetIds: [],
      };

      before('Create users, roles', () => {
        cy.createTempUser([]).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;
        });
        cy.createTempUser([]).then((createdUserAProperties) => {
          testData.userB = createdUserAProperties;
        });
        cy.createAuthorizationRoleApi().then((role) => {
          testData.roleAId = role.id;
        });
        cy.createAuthorizationRoleApi().then((role) => {
          testData.roleBId = role.id;
        });
        cy.getCapabilitiesApi(3).then((capabs) => {
          testData.capabIds = capabs.map((capab) => capab.id);
        });
        cy.getCapabilitySetsApi(3).then((capabSets) => {
          testData.capabSetIds = capabSets.map((capabSet) => capabSet.id);
        });
      });

      after('Delete users, roles', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        cy.deleteAuthorizationRoleApi(testData.roleAId);
        cy.deleteAuthorizationRoleApi(testData.roleBId);
      });

      it(
        'C523660 Assigning capabilities to a role/user via API (eureka)',
        { tags: ['criticalPath', 'eureka', 'C523660'] },
        () => {
          cy.getAdminToken();
          cy.addCapabilitiesToNewRoleApi(testData.roleAId, [
            testData.capabIds[0],
            testData.capabIds[1],
          ]).then(({ status }) => {
            expect(status).to.eq(201);
          });
          cy.addCapabilitiesToNewUserApi(testData.userA.userId, testData.capabIds).then(
            ({ status }) => {
              expect(status).to.eq(201);
            },
          );
          cy.updateCapabilitiesForRoleApi(testData.roleAId, [
            testData.capabIds[0],
            testData.capabIds[1],
          ]).then(({ status }) => {
            expect(status).to.eq(204);
          });
          cy.getCapabilitiesForRoleApi(testData.roleAId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.capabilities).to.have.lengthOf(2);
            expect(
              body.capabilities.filter((capab) => capab.id === testData.capabIds[0]),
            ).to.have.lengthOf(1);
            expect(
              body.capabilities.filter((capab) => capab.id === testData.capabIds[1]),
            ).to.have.lengthOf(1);
          });
          cy.updateCapabilitiesForUserApi(testData.userA.userId, testData.capabIds).then(
            ({ status }) => {
              expect(status).to.eq(204);
            },
          );
          cy.getCapabilitiesForUserApi(testData.userA.userId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.userCapabilities).to.have.lengthOf(testData.capabIds.length);
            testData.capabIds.forEach((capabId) => {
              expect(
                body.userCapabilities.filter((capab) => capab.capabilityId === capabId),
              ).to.have.lengthOf(1);
            });
          });
          cy.updateCapabilitiesForRoleApi(testData.roleAId, [
            testData.capabIds[0],
            testData.capabIds[1],
          ]).then(({ status }) => {
            expect(status).to.eq(204);
          });
          cy.getCapabilitiesForRoleApi(testData.roleAId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.capabilities).to.have.lengthOf(2);
            expect(
              body.capabilities.filter((capab) => capab.id === testData.capabIds[0]),
            ).to.have.lengthOf(1);
            expect(
              body.capabilities.filter((capab) => capab.id === testData.capabIds[1]),
            ).to.have.lengthOf(1);
          });
          cy.updateCapabilitiesForUserApi(testData.userA.userId, [testData.capabIds[0]]).then(
            ({ status }) => {
              expect(status).to.eq(204);
            },
          );
          cy.getCapabilitiesForUserApi(testData.userA.userId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.userCapabilities).to.have.lengthOf(1);
            expect(
              body.userCapabilities.filter((capab) => capab.capabilityId === testData.capabIds[0]),
            ).to.have.lengthOf(1);
          });
        },
      );

      it(
        'C523661 Assigning capability sets to a role/user via API (eureka)',
        { tags: ['criticalPath', 'eureka', 'C523661'] },
        () => {
          cy.getAdminToken();
          cy.addCapabilitySetsToNewRoleApi(testData.roleBId, testData.capabSetIds).then(
            ({ status }) => {
              expect(status).to.eq(201);
            },
          );
          cy.addCapabilitySetsToNewUserApi(testData.userB.userId, [testData.capabSetIds[0]]).then(
            ({ status }) => {
              expect(status).to.eq(201);
            },
          );
          cy.updateCapabilitySetsForRoleApi(testData.roleBId, testData.capabSetIds).then(
            ({ status }) => {
              expect(status).to.eq(204);
            },
          );
          cy.getCapabilitySetsForRoleApi(testData.roleBId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.capabilitySets).to.have.lengthOf(testData.capabSetIds.length);
            testData.capabSetIds.forEach((capabSetId) => {
              expect(
                body.capabilitySets.filter((capabSet) => capabSet.id === capabSetId),
              ).to.have.lengthOf(1);
            });
          });
          cy.updateCapabilitySetsForUserApi(testData.userB.userId, [testData.capabSetIds[0]]).then(
            ({ status }) => {
              expect(status).to.eq(204);
            },
          );
          cy.getCapabilitySetsForUserApi(testData.userB.userId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.userCapabilitySets).to.have.lengthOf(1);
            expect(
              body.userCapabilitySets.filter(
                (capabSet) => capabSet.capabilitySetId === testData.capabSetIds[0],
              ),
            ).to.have.lengthOf(1);
          });
          cy.updateCapabilitySetsForRoleApi(testData.roleBId, [testData.capabSetIds[2]]).then(
            ({ status }) => {
              expect(status).to.eq(204);
            },
          );
          cy.getCapabilitySetsForRoleApi(testData.roleBId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.capabilitySets).to.have.lengthOf(1);
            expect(
              body.capabilitySets.filter((capabSet) => capabSet.id === testData.capabSetIds[2]),
            ).to.have.lengthOf(1);
          });
          cy.updateCapabilitySetsForUserApi(testData.userB.userId, [
            testData.capabSetIds[1],
            testData.capabSetIds[2],
          ]).then(({ status }) => {
            expect(status).to.eq(204);
          });
          cy.getCapabilitySetsForUserApi(testData.userB.userId).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.userCapabilitySets).to.have.lengthOf(2);
            expect(
              body.userCapabilitySets.filter(
                (capabSet) => capabSet.capabilitySetId === testData.capabSetIds[1],
              ),
            ).to.have.lengthOf(1);
            expect(
              body.userCapabilitySets.filter(
                (capabSet) => capabSet.capabilitySetId === testData.capabSetIds[2],
              ),
            ).to.have.lengthOf(1);
          });
        },
      );
    });
  });
});
