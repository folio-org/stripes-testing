import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C423999 ${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.updateRolesForUserApi(testData.user.userId, []);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C423999 Creating new authorization role (only name/description specified) (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          cy.intercept('POST', '/roles*').as('roles');
          cy.intercept('POST', '/roles/capability-sets*').as('capabilitySets');
          cy.intercept('POST', '/roles/capabilities*').as('capabilities');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@roles').then((res) => {
            expect(res.response.body.name).to.eq(testData.roleName);
            expect(res.response.body.description).to.eq(testData.roleDescription);
            testData.roleId = res.response.body.id;
            cy.wait(2000);
            cy.get('@capabilitySets.all').then((calls) => {
              expect(calls).to.have.length(0);
            });
            cy.get('@capabilities.all').then((calls) => {
              expect(calls).to.have.length(0);
            });
          });
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion(false);
          AuthorizationRoles.clickOnCapabilitiesAccordion(false);
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
        },
      );
    });
  });
});