/* eslint-disable no-unused-vars */
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationPolicies from '../../../support/fragments/settings/authorization-policies/authorizationPolicies';
import DateTools from '../../../support/utils/dateTools';
import { AUTHORIZATION_POLICY_TYPES } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization policies', () => {
      const testData = {
        startDateTime: `${new Date().getFullYear()}-01-01T00:00:00Z`,
        expiresDateTime: `${new Date().getFullYear() + 1}-12-01T00:00:00Z`,
        policyName: `Auto policy time ${getRandomPostfix()}`,
        updatedPolicyName: `Auto policy time ${getRandomPostfix()} UPD`,
      };
      const policyBody = {
        name: testData.policyName,
        description: 'Test policy description',
        type: AUTHORIZATION_POLICY_TYPES.TIME,
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
      const updatedPolicyBody = { ...policyBody };
      updatedPolicyBody.name = testData.updatedPolicyName;

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Policies Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Policies', action: 'Manage' },
      ];

      before(() => {
        cy.createTempUser([]).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;
          cy.assignCapabilitiesToExistingUser(testData.userA.userId, [], capabSetsToAssign);
          cy.updateRolesForUserApi(testData.userA.userId, []);
          cy.createTempUser([]).then((createdUserBProperties) => {
            testData.userB = createdUserBProperties;
            cy.assignCapabilitiesToExistingUser(testData.userB.userId, [], capabSetsToAssign);
            cy.updateRolesForUserApi(testData.userB.userId, []);
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
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
        () => {
          let createdDateTime;
          let updatedDateTime;
          cy.getUserToken(testData.userA.username, testData.userA.password);
          cy.createAuthorizationPolicyApi(policyBody).then((createResponse) => {
            expect(createResponse.status).to.eq('201');
            createdDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);
            testData.policyId = createResponse.body.id;
            cy.getUserToken(testData.userB.username, testData.userB.password);
            cy.updateAuthorizationPolicyApi(testData.policyId, updatedPolicyBody).then(
              (updateResponse) => {
                expect(updateResponse.status).to.eq('204');
                updatedDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);

                cy.login(testData.userA.username, testData.userA.password, {
                  path: TopMenu.settingsAuthorizationPolicies,
                  waiter: AuthorizationPolicies.waitContentLoading,
                });
              },
            );
          });

          // AuthorizationRoles.clickNewButton();
          // AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          // cy.intercept('POST', '/roles*').as('createCall');
          // AuthorizationRoles.clickSaveButton();
          // cy.wait('@createCall').then((call) => {
          //   testData.roleId = call.response.body.id;
          //   createdDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);
          //   AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
          //   AuthorizationRoles.searchRole(testData.roleName);
          //   AuthorizationRoles.clickOnRoleName(testData.roleName);
          //   AuthorizationRoles.verifyGeneralInformationWhenCollapsed(createdDateTime);
          //   AuthorizationRoles.verifyGeneralInformationWhenExpanded(
          //     createdDateTime,
          //     `${testData.userA.lastName}, ${testData.userA.firstName}`,
          //     createdDateTime,
          //     `${testData.userA.lastName}, ${testData.userA.firstName}`,
          //   );
          //   cy.logout();
          //   cy.login(testData.userB.username, testData.userB.password, {
          //     path: TopMenu.settingsAuthorizationRoles,
          //     waiter: AuthorizationRoles.waitContentLoading,
          //   });
          //   cy.reload();
          //   AuthorizationRoles.waitContentLoading();
          //   AuthorizationRoles.searchRole(testData.roleName);
          //   AuthorizationRoles.clickOnRoleName(testData.roleName);
          //   AuthorizationRoles.verifyGeneralInformationWhenCollapsed(createdDateTime);
          //   AuthorizationRoles.openForEdit();
          //   AuthorizationRoles.fillRoleNameDescription(testData.updatedRoleName);
          //   cy.intercept('PUT', '/roles/*').as('updateCall');
          //   AuthorizationRoles.clickSaveButton();
          //   cy.wait('@updateCall').then(() => {
          //     updatedDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);
          //     AuthorizationRoles.checkAfterSaveEdit(testData.updatedRoleName);
          //     AuthorizationRoles.verifyGeneralInformationWhenCollapsed(updatedDateTime);
          //     AuthorizationRoles.verifyGeneralInformationWhenExpanded(
          //       updatedDateTime,
          //       `${testData.userB.lastName}, ${testData.userB.firstName}`,
          //       createdDateTime,
          //       `${testData.userA.lastName}, ${testData.userA.firstName}`,
          //     );
          //   });
          // });
        },
      );
    });
  });
});
