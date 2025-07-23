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
      roleName: `AT_C543745_UserRole_${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.DELETE,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.EDIT,
      },
    ];
    const capabsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignCollege = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.DELETE,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Users Roles',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let tempUser;
    let userCollege;

    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          tempUser = userProperties;
          cy.assignCapabilitiesToExistingUser(
            tempUser.userId,
            capabsToAssign,
            capabSetsToAssignCentral,
          );
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, tempUser.userId);
          cy.createAuthorizationRoleApi(testData.roleName).then((roleCentral) => {
            testData.roleCentralId = roleCentral.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            tempUser.userId,
            capabsToAssign,
            capabSetsToAssignCollege,
          );
          cy.createAuthorizationRoleApi(testData.roleName).then((roleCollege) => {
            testData.roleCollegeId = roleCollege.id;
            cy.createTempUser([]).then((userCollegeProperties) => {
              userCollege = userCollegeProperties;
              cy.addRolesToNewUserApi(userCollege.userId, [testData.roleCollegeId]);
            });
          });
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      cy.deleteAuthorizationRoleApi(testData.roleCentralId);

      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(userCollege.userId);
      cy.deleteAuthorizationRoleApi(testData.roleCollegeId, true);
    });

    it(
      'C543745 ECS | Eureka | Delete authorization role through consortium manager (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C543745'] },
      () => {
        cy.resetTenant();
        cy.login(tempUser.username, tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.verifyAssignedUser(userCollege.lastName, userCollege.firstName);
        AuthorizationRoles.clickDeleteRole(testData.roleName);
        AuthorizationRoles.cancelDeleteRole(testData.roleName);
        AuthorizationRoles.clickDeleteRole(testData.roleName);
        AuthorizationRoles.confirmDeleteRole(testData.roleName);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.checkRoleFound(testData.roleName, false);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.checkRoleFound(testData.roleName, false);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.searchByKeywords(userCollege.userId);
        UsersCard.verifyUserCardOpened();
        UsersCard.verifyUserRolesCounter('0');
      },
    );
  });
});
