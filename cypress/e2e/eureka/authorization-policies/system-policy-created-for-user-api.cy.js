import Users from '../../../support/fragments/users/users';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import {
  AUTHORIZATION_POLICY_TYPES,
  AUTHORIZATION_POLICY_SOURCES,
} from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization policies', () => {
      const testData = {
        capabId: '',
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationPoliciesSettingsAdmin,
        CapabilitySets.policies,
        CapabilitySets.users,
        CapabilitySets.userCapabilities,
      ];

      before('Create users', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.userA = createdUserProperties;
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);
          cy.assignCapabilitiesToExistingUser(testData.userA.userId, [], capabSetsToAssign);
        });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.userB = createdUserProperties;
        });
        cy.getCapabilitiesApi(1).then((capabs) => {
          testData.capabId = capabs[0].id;
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
      });

      it(
        'C514999 Verify "system" policy is created for a user after capabilities assignment (eureka)',
        { tags: ['criticalPath', 'eureka', 'C514999'] },
        () => {
          cy.getToken(testData.userA.username, testData.userA.password);
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
