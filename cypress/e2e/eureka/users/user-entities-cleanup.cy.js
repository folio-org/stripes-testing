import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { AUTHORIZATION_POLICY_TYPES } from '../../../support/constants';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      roleName: `AT_C436914_UserRole_${getRandomPostfix()}`,
    };

    before(() => {
      cy.createTempUser().then((user) => {
        testData.user = user;
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;
          cy.addRolesToNewUserApi(user.userId, [role.id]);
          cy.getCapabilitiesApi(2).then((capabs) => {
            cy.getCapabilitySetsApi(2).then((capabSets) => {
              cy.addCapabilitiesToNewUserApi(
                user.userId,
                capabs.map((capab) => capab.id),
              );
              cy.addCapabilitySetsToNewUserApi(
                user.userId,
                capabSets.map((capabSet) => capabSet.id),
              );
            });
          });
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
    });

    it(
      'C436914 User-related entities are deleted when user is deleted (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C436914'] },
      () => {
        Users.deleteViaApi(testData.user.userId).then((status) => {
          cy.expect(status).equals(204);
          cy.getAuthorizationPoliciesForEntityApi(
            AUTHORIZATION_POLICY_TYPES.USER,
            testData.user.userId,
          ).then((response) => {
            cy.expect(response.status).equals(200);
            cy.expect(response.body.policies.length).equals(0);
            cy.expect(response.body.totalRecords).equals(0);
          });
          cy.getAuthorizationRolesForUserApi(testData.user.userId).then((response) => {
            cy.expect(response.status).equals(200);
            cy.expect(response.body.userRoles.length).equals(0);
            cy.expect(response.body.totalRecords).equals(0);
          });
          cy.getCapabilitiesForUserApi(testData.user.userId).then((response) => {
            cy.expect(response.status).equals(200);
            cy.expect(response.body.capabilities.length).equals(0);
            cy.expect(response.body.totalRecords).equals(0);
          });
          cy.getCapabilitySetsForUserApi(testData.user.userId).then((response) => {
            cy.expect(response.status).equals(200);
            cy.expect(response.body.capabilitySets.length).equals(0);
            cy.expect(response.body.totalRecords).equals(0);
          });
        });
      },
    );
  });
});
