import Users from '../../../../support/fragments/users/users';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const { user, memberTenant } = parseSanityParameters();

      const testData = {
        capabIds: [],
      };

      before('Create users, roles', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();

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
      });

      after('Delete users, roles', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        cy.deleteAuthorizationRoleApi(testData.roleAId);
        cy.deleteAuthorizationRoleApi(testData.roleBId);
      });

      it(
        'C523660 Assigning capabilities to a role/user via API (eureka)',
        { tags: ['dryRun', 'eureka', 'C523660'] },
        () => {
          cy.setTenant(memberTenant.id);
          cy.allure().logCommandSteps(false);
          cy.getUserToken(user.username, user.password, { log: false });
          cy.allure().logCommandSteps();
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
            expect(body.capabilities).to.have.lengthOf(testData.capabIds.length);
            testData.capabIds.forEach((capabId) => {
              expect(body.capabilities.filter((capab) => capab.id === capabId)).to.have.lengthOf(1);
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
            expect(body.capabilities).to.have.lengthOf(1);
            expect(
              body.capabilities.filter((capab) => capab.id === testData.capabIds[0]),
            ).to.have.lengthOf(1);
          });
        },
      );
    });
  });
});
