import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationPolicies from '../../../support/fragments/settings/authorization-policies/authorizationPolicies';
import DateTools from '../../../support/utils/dateTools';
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
        policyName: `AT_C464308_AuthPolicy_Time_${getRandomPostfix()}`,
        updatedPolicyName: `AT_C464308_AuthPolicy_Time_${getRandomPostfix()} UPD`,
      };
      const policyBody = {
        name: testData.policyName,
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
        source: AUTHORIZATION_POLICY_SOURCES.USER,
      };
      const updatedPolicyBody = { ...policyBody };
      updatedPolicyBody.name = testData.updatedPolicyName;

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Policies Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Policies', action: 'Manage' },
        { type: 'Data', resource: 'Users', action: 'Manage' },
      ];

      before(() => {
        cy.getAdminToken();
        // set default locale settings for tenant (with UTC)
        cy.setDefaultLocaleApi();
        cy.createTempUser([]).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;
          cy.assignCapabilitiesToExistingUser(testData.userA.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);
          cy.createTempUser([]).then((createdUserBProperties) => {
            testData.userB = createdUserBProperties;
            cy.assignCapabilitiesToExistingUser(testData.userB.userId, [], capabSetsToAssign);
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userB.userId, []);
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        cy.deleteAuthorizationPolicyApi(testData.policyId);
      });

      it(
        'C464308 "General Information" accordion is properly populated when creating/updating a policy (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C464308'] },
        () => {
          let createdDateTime;
          let updatedDateTime;
          cy.getUserToken(testData.userA.username, testData.userA.password);
          cy.createAuthorizationPolicyApi(policyBody).then((createResponse) => {
            expect(createResponse.status).to.eq(201);
            createdDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);
            testData.policyId = createResponse.body.id;
            cy.getUserToken(testData.userB.username, testData.userB.password);
            cy.updateAuthorizationPolicyApi(testData.policyId, updatedPolicyBody).then(
              (updateResponse) => {
                expect(updateResponse.status).to.eq(204);
                updatedDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);

                cy.login(testData.userA.username, testData.userA.password, {
                  path: TopMenu.settingsAuthorizationPolicies,
                  waiter: AuthorizationPolicies.waitContentLoading,
                });
                AuthorizationPolicies.searchPolicy(testData.updatedPolicyName);
                AuthorizationPolicies.clickOnPolicyName(testData.updatedPolicyName);
                AuthorizationPolicies.verifyGeneralInformationWhenCollapsed(updatedDateTime);
                AuthorizationPolicies.verifyGeneralInformationWhenExpanded(
                  updatedDateTime,
                  `${testData.userB.lastName}, ${testData.userB.firstName}`,
                  createdDateTime,
                  `${testData.userA.lastName}, ${testData.userA.firstName}`,
                );
              },
            );
          });
        },
      );
    });
  });
});
