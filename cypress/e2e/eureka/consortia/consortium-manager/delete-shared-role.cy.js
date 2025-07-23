import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C543755_UserRole_${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.CREATE,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.DELETE,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Users Roles',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMembers = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Users Roles',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const testUser = {};
    const assignUserCentral = {};
    const assignUserCollege = {};

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          Object.assign(testUser, userProperties);
        });
        cy.createTempUser([]).then((userProperties) => {
          Object.assign(assignUserCentral, userProperties);
        });
      }).then(() => {
        cy.assignCapabilitiesToExistingUser(
          testUser.userId,
          capabsToAssign,
          capabSetsToAssignCentral,
        );
        cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
        cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;
          cy.shareRoleWithCapabilitiesApi({ id: testData.roleId, name: testData.roleName }).then(
            () => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser([]).then((userProperties) => {
                Object.assign(assignUserCollege, userProperties);
              });
              cy.assignCapabilitiesToExistingUser(
                testUser.userId,
                capabsToAssign,
                capabSetsToAssignMembers,
              );
              cy.setTenant(Affiliations.University);
              cy.wait(10_000);
              cy.assignCapabilitiesToExistingUser(
                testUser.userId,
                capabsToAssign,
                capabSetsToAssignMembers,
              );
            },
          );
        });
      });
    });

    before('Assign roles', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.addRolesToNewUserApi(assignUserCentral.userId, [testData.roleId]);
      cy.setTenant(Affiliations.College);
      cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
        cy.addRolesToNewUserApi(assignUserCollege.userId, [roleId]);
      });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(assignUserCentral.userId);
      cy.deleteSharedRoleApi({ id: testData.roleId, name: testData.roleName }, true);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUserCollege.userId);
    });

    it(
      'C543755 ECS | Eureka | Delete shared role from consortium manager with users assigned to it (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C543755'] },
      () => {
        cy.resetTenant();
        cy.login(testUser.username, testUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        AuthorizationRoles.waitContentLoading();
        SelectMembers.selectAllMembers();
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);
        AuthorizationRoles.closeRoleDetailView(testData.roleName);
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleName);
        AuthorizationRoles.closeRoleDetailView(testData.roleName);
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
        AuthorizationRoles.checkActionsOptionsAvailable(true, true, true, testData.roleName);
        AuthorizationRoles.clickActionsButton(testData.roleName);
        AuthorizationRoles.checkShareToAllButtonShown(false);
        AuthorizationRoles.clickActionsButton(testData.roleName);
        AuthorizationRoles.clickDeleteRole(testData.roleName);
        AuthorizationRoles.cancelDeleteRole(testData.roleName);
        AuthorizationRoles.clickDeleteRole(testData.roleName);
        AuthorizationRoles.confirmDeleteRole(testData.roleName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.checkRoleFound(testData.roleName, false);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.searchByUsername(assignUserCentral.username);
        UsersSearchPane.selectUserFromList(assignUserCentral.username);
        UsersCard.verifyUserRolesCounter('0');

        cy.waitForAuthRefresh(() => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.reload();
        }, 20_000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.checkRoleFound(testData.roleName, false);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.searchByUsername(assignUserCollege.username);
        UsersSearchPane.selectUserFromList(assignUserCollege.username);
        UsersCard.verifyUserRolesCounter('0');

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.checkRoleFound(testData.roleName, false);
      },
    );
  });
});
