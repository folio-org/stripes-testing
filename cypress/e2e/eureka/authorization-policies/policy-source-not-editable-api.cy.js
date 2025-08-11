import getRandomPostfix from '../../../support/utils/stringTools';
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
        startDateTime: `${new Date().getFullYear()}-01-01T00:00:00Z`,
        expiresDateTime: `${new Date().getFullYear() + 1}-12-01T00:00:00Z`,
        policyAName: `AT_C514991_AuthPolicy_A_${getRandomPostfix()}`,
        policyBName: `AT_C514991_AuthPolicy_B_${getRandomPostfix()}`,
        policyBNewName: `AT_C514991_AuthPolicy_B_New_${getRandomPostfix()}`,
        noSourceErrorText: 'null value in column "source"',
      };
      const policyBody = {
        name: '',
        description: 'Test policy description',
        type: AUTHORIZATION_POLICY_TYPES.TIME.toUpperCase(),
        timePolicy: {
          repeat: false,
          start: testData.startDateTime,
          expires: testData.expiresDateTime,
          dayOfMonthStart: 5,
          dayOfMonthEnd: 20,
          monthStart: 1,
          monthEnd: 12,
          hourStart: 8,
          hourEnd: 17,
          minuteStart: 0,
          minuteEnd: 30,
        },
      };
      const policyABody = { ...policyBody };
      policyABody.name = testData.policyAName;
      policyABody.source = AUTHORIZATION_POLICY_SOURCES.SYSTEM;
      const policyBBody = { ...policyBody };
      policyBBody.name = testData.policyBName;

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationPoliciesSettingsAdmin,
        CapabilitySets.policies,
        CapabilitySets.users,
      ];

      before('Create users', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.tempUser = createdUserProperties;
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
          cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.tempUser.userId);
        cy.deleteAuthorizationPolicyApi(testData.policyAId);
        cy.deleteAuthorizationPolicyApi(testData.policyBId);
      });

      it(
        'C514991 Verify "source" field for authorization policy cannot be updated (eureka)',
        { tags: ['extendedPath', 'eureka', 'C514991'] },
        () => {
          cy.getToken(testData.tempUser.username, testData.tempUser.password);
          cy.createAuthorizationPolicyApi(policyABody).then((response1) => {
            expect(response1.status).to.eq(201);
            expect(response1.body.source).to.eq(AUTHORIZATION_POLICY_SOURCES.SYSTEM);
            testData.policyAId = response1.body.id;
            cy.createAuthorizationPolicyApi(policyBBody, true).then((response2) => {
              expect(response2.status).to.eq(400);
              expect(response2.body.errors[0].message).to.include(testData.noSourceErrorText);
              policyBBody.name = testData.policyBNewName;
              policyBBody.source = AUTHORIZATION_POLICY_SOURCES.USER;
              cy.createAuthorizationPolicyApi(policyBBody).then((response3) => {
                expect(response3.status).to.eq(201);
                expect(response3.body.source).to.eq(AUTHORIZATION_POLICY_SOURCES.USER);
                testData.policyBId = response3.body.id;
                policyABody.source = AUTHORIZATION_POLICY_SOURCES.USER;
                cy.updateAuthorizationPolicyApi(testData.policyAId, policyABody).then(
                  (response) => {
                    expect(response.status).to.eq(204);
                  },
                );
                policyBBody.source = AUTHORIZATION_POLICY_SOURCES.SYSTEM;
                cy.updateAuthorizationPolicyApi(testData.policyBId, policyBBody).then(
                  (response) => {
                    expect(response.status).to.eq(204);
                  },
                );
                cy.getAuthorizationPolicyByIdApi(testData.policyAId).then((response) => {
                  expect(response.status).to.eq(200);
                  expect(response.body.source).to.eq(AUTHORIZATION_POLICY_SOURCES.SYSTEM);
                });
                cy.getAuthorizationPolicyByIdApi(testData.policyBId).then((response) => {
                  expect(response.status).to.eq(200);
                  expect(response.body.source).to.eq(AUTHORIZATION_POLICY_SOURCES.USER);
                });
              });
            });
          });
        },
      );
    });
  });
});
