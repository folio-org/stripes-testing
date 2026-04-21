import Users from '../../../../support/fragments/users/users';
import {
  AUTHORIZATION_POLICY_TYPES,
  AUTHORIZATION_POLICY_SOURCES,
} from '../../../../support/constants';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization policies', () => {
      const { user, memberTenant } = parseSanityParameters();

      const testData = {
        capabId: '',
      };

      before('Create users', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        testData.userA = user;
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.userB = createdUserProperties;
        });
        cy.getCapabilitiesApi(50).then((capabs) => {
          const validCapab = capabs.filter((capab) => capab.endpoints.length > 0)[0];
          testData.capabId = validCapab.id;
        });
      });

      after('Delete user', () => {
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        Users.deleteViaApi(testData.userB.userId);
      });

      it(
        'C514999 Verify "system" policy is created for a user after capabilities assignment (eureka)',
        { tags: ['dryRun', 'eureka', 'C514999'] },
        () => {
          cy.getAuthorizationPoliciesForEntityApi(
            AUTHORIZATION_POLICY_TYPES.USER,
            testData.userB.userId,
          ).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.policies).to.have.lengthOf(0);
          });
          cy.addCapabilitiesToNewUserApi(testData.userB.userId, [testData.capabId]).then(
            ({ status }) => {
              expect(status).to.eq(201);
            },
          );
          cy.getAuthorizationPoliciesForEntityApi(
            AUTHORIZATION_POLICY_TYPES.USER,
            testData.userB.userId,
          ).then(({ status, body }) => {
            expect(status).to.eq(200);
            expect(body.policies).to.have.lengthOf(1);
            expect(body.policies[0].source).to.eq(AUTHORIZATION_POLICY_SOURCES.SYSTEM);
            testData.userPolicyId = body.policies[0].id;
            testData.policyBody = body.policies[0];
            delete testData.policyBody.id;
            testData.policyBody.source = AUTHORIZATION_POLICY_SOURCES.USER;
            cy.updateAuthorizationPolicyApi(testData.userPolicyId, testData.policyBody).then(
              (response) => {
                expect(response.status).to.eq(204);
              },
            );
            cy.getAuthorizationPoliciesForEntityApi(
              AUTHORIZATION_POLICY_TYPES.USER,
              testData.userB.userId,
            ).then((response) => {
              expect(response.status).to.eq(200);
              expect(response.body.policies[0].source).to.eq(AUTHORIZATION_POLICY_SOURCES.SYSTEM);
            });
          });
        },
      );
    });
  });
});
