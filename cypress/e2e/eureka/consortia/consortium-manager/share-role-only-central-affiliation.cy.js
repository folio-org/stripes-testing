import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
  AUTHORIZATION_ROLE_TYPES,
} from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C523612_UserRole_${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.CREATE,
      },
      {
        type: CAPABILITY_TYPES.PROCEDURAL,
        resource: 'UI-Consortia-Settings Consortium-Manager Share',
        action: CAPABILITY_ACTIONS.EXECUTE,
      },
    ];
    const capabsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const testUser = {};

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          Object.assign(testUser, userProperties);
        });
      }).then(() => {
        cy.assignCapabilitiesToExistingUser(
          testUser.userId,
          capabsToAssignCentral,
          capabSetsToAssignCentral,
        );
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;
        });
      });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
    });

    it(
      'C523612 ECS | Eureka | Share authorization role when only central tenant is selected in "Select members" (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C523612'] },
      () => {
        cy.login(testUser.username, testUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(1);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        cy.intercept('GET', `/roles/${testData.roleId}`).as('getRole');
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        cy.wait('@getRole')
          .its('response.body.type')
          .should('eq', AUTHORIZATION_ROLE_TYPES.REGULAR.toUpperCase());
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.verifyRoleType(testData.roleName, AUTHORIZATION_ROLE_TYPES.REGULAR);
        cy.intercept('GET', `/roles/${testData.roleId}`).as('getRole2');
        AuthorizationRoles.shareRole(testData.roleName);
        cy.wait('@getRole2')
          .its('response.body.type')
          .should('eq', AUTHORIZATION_ROLE_TYPES.CONSORTIUM.toUpperCase());
        AuthorizationRoles.verifyRoleType(testData.roleName, AUTHORIZATION_ROLE_TYPES.CONSORTIUM);
        cy.logout();

        // for unclear reasons, tenant name may not load for an admin without waiting
        cy.wait(15_000);
        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        }, 20_000);
        TopMenuNavigation.openAppFromDropdown(
          APPLICATION_NAMES.SETTINGS,
          SETTINGS_SUBSECTION_AUTH_ROLES,
        );
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        TopMenuNavigation.openAppFromDropdown(
          APPLICATION_NAMES.SETTINGS,
          SETTINGS_SUBSECTION_AUTH_ROLES,
        );
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);
      },
    );
  });
});
