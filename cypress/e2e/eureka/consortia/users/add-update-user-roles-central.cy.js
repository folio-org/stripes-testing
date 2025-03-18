import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import UserEdit from '../../../../support/fragments/users/userEdit';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleNameA: `AT_C514902_UserRole_CA_${randomPostfix}`,
        centralRoleNameB: `AT_C514902_UserRole_CB_${randomPostfix}`,
        centralRoleNameC: `AT_C514902_UserRole_CC_${randomPostfix}`,
        collegeRoleNameA: `AT_C514902_UserRole_M1A_${randomPostfix}`,
        collegeRoleNameB: `AT_C514902_UserRole_M1B_${randomPostfix}`,
        collegeRoleNameC: `AT_C514902_UserRole_M1C_${randomPostfix}`,
      };

      const capabSetsToAssign = [{ type: 'Data', resource: 'UI-Users Roles', action: 'Manage' }];

      const capabsToAssign = [
        { type: 'Settings', resource: 'Settings Enabled', action: 'View' },
        { type: 'Data', resource: 'Consortia User-Tenants Collection', action: 'View' },
      ];

      const testUser = {};
      const assignUser = {};
      const centralRoleIds = [];
      const collegeRoleIds = [];

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((tempUserProperties) => {
          Object.assign(testUser, tempUserProperties);
          cy.createTempUser([]).then((assignUserProperties) => {
            Object.assign(assignUser, assignUserProperties);
            cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
            cy.assignAffiliationToUser(Affiliations.College, assignUser.userId);
            cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
            [
              testData.centralRoleNameA,
              testData.centralRoleNameB,
              testData.centralRoleNameC,
            ].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                centralRoleIds.push(role.id);
              });
            });
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
            [
              testData.collegeRoleNameA,
              testData.collegeRoleNameB,
              testData.collegeRoleNameC,
            ].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                collegeRoleIds.push(role.id);
              });
            });
          });
        });
      });

      before('Login', () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testUser.username, testUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          cy.reload();
        }, 20_000);
        Users.waitLoading();
      });

      after('Delete roles, users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        centralRoleIds.forEach((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
        Users.deleteViaApi(testUser.userId);
        Users.deleteViaApi(assignUser.userId);
        cy.setTenant(Affiliations.College);
        collegeRoleIds.forEach((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C514902 Add/update roles when editing a user in Central tenant (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C514902'] },
        () => {
          UsersSearchPane.searchByUsername(testUser.username);
          UsersSearchPane.selectUserFromList(testUser.username);
          UsersCard.verifyUserRolesCounter('0');
          UserEdit.openEdit();
          UserEdit.verifyUserRolesCounter('0');
          UserEdit.clickUserRolesAccordion();
          UserEdit.checkSelectedRolesAffiliation(tenantNames.central);
          UserEdit.verifyUserRolesAccordionEmpty();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.centralRoleNameA);
          UserEdit.selectRoleInModal(testData.centralRoleNameB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(2);

          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.verifyUserRolesAccordionEmpty();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.collegeRoleNameA);
          UserEdit.selectRoleInModal(testData.collegeRoleNameB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(2);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(2);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          Users.waitLoading();
          // TopMenuNavigation.navigateToApp(
          //   APPLICATION_NAMES.SETTINGS,
          //   SETTINGS_SUBSECTION_AUTH_ROLES,
          // );
          // AuthorizationRoles.waitContentLoading();
          // AuthorizationRoles.searchRole(testData.collegeRoleNameA);
          // AuthorizationRoles.clickOnRoleName(testData.collegeRoleNameA, false);
          // AuthorizationRoles.clickAssignUsersButton();
          // AuthorizationRoles.selectUserInModal(testData.testUser.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.testUser.lastName,
          //   testData.testUser.firstName,
          // );
          // AuthorizationRoles.searchRole(testData.collegeRoleNameB);
          // AuthorizationRoles.clickOnRoleName(testData.collegeRoleNameB, false);
          // AuthorizationRoles.clickAssignUsersButton();
          // AuthorizationRoles.selectUserInModal(testData.testUser.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.testUser.lastName,
          //   testData.testUser.firstName,
          // );

          // TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          // Users.waitLoading();
          // UsersSearchPane.searchByUsername(testData.testUser.username);
          // UsersSearchPane.clickOnUserRowContaining(testData.testUser.username);
          // UsersCard.verifyUserRolesCounter('2');
          // UsersCard.clickUserRolesAccordion();
          // UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          // UsersCard.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          // UsersCard.selectRolesAffiliation(tenantNames.central);
          // UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          // UsersCard.selectRolesAffiliation(tenantNames.university);
          // UsersCard.verifyUserRolesAccordionEmpty();

          // ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          // Users.waitLoading();
          // TopMenuNavigation.navigateToApp(
          //   APPLICATION_NAMES.SETTINGS,
          //   SETTINGS_SUBSECTION_AUTH_ROLES,
          // );
          // AuthorizationRoles.waitContentLoading();
          // AuthorizationRoles.searchRole(testData.universityRoleNameA);
          // AuthorizationRoles.clickOnRoleName(testData.universityRoleNameA, false);
          // AuthorizationRoles.clickAssignUsersButton();
          // AuthorizationRoles.selectUserInModal(testData.testUser.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.testUser.lastName,
          //   testData.testUser.firstName,
          // );
          // AuthorizationRoles.searchRole(testData.universityRoleNameB);
          // AuthorizationRoles.clickOnRoleName(testData.universityRoleNameB, false);
          // AuthorizationRoles.clickAssignUsersButton();
          // AuthorizationRoles.selectUserInModal(testData.testUser.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.testUser.lastName,
          //   testData.testUser.firstName,
          // );

          // TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          // Users.waitLoading();
          // UsersSearchPane.searchByUsername(testData.testUser.username);
          // UsersSearchPane.clickOnUserRowContaining(testData.testUser.username);
          // UsersCard.verifyUserRolesCounter('2');
          // UsersCard.clickUserRolesAccordion();
          // UsersCard.checkSelectedRolesAffiliation(tenantNames.university);
          // UsersCard.verifyUserRoleNames([
          //   testData.universityRoleNameA,
          //   testData.universityRoleNameB,
          // ]);
          // UsersCard.selectRolesAffiliation(tenantNames.central);
          // UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          // UsersCard.selectRolesAffiliation(tenantNames.college);
          // UsersCard.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
        },
      );
    });
  });
});
