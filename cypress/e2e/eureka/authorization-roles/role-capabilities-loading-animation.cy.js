import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C434130_UserRole_${getRandomPostfix()}`,
        capabilitySets: [
          {
            table: 'Data',
            resource: 'Acquisitions-Units Memberships',
            action: 'Manage',
          },
          {
            table: 'Settings',
            resource: 'UI-Authorization-Policies Settings Admin',
            action: 'View',
          },
        ],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
      ];

      before('Creating user, login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      after('Deleting user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C434130 Loading animation is shown when loading capabilities upon authorization role creation/editing (eureka)',
        { tags: ['extendedPath', 'eureka', 'eurekaPhase1', 'C434130'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectAllApplicationsInModal();
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.checkCapabilitySpinnersShown();
          AuthorizationRoles.checkCapabilitySpinnersAbsent();
          testData.capabilitySets.forEach((set) => {
            AuthorizationRoles.selectCapabilitySetCheckbox(set);
          });
          cy.intercept('POST', '/roles*').as('rolesCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@rolesCall').then((call) => {
            testData.roleId = call.response.body.id;
          });
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEditWithoutChecks();
          AuthorizationRoles.checkCapabilitySpinnersShown();
          AuthorizationRoles.checkCapabilitySpinnersAbsent();
        },
      );
    });
  });
});
