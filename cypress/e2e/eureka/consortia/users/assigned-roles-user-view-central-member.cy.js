import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleNameA: `AT_C514892_Userrole_CA_${randomPostfix}`,
        centralRoleNameB: `AT_C514892_Userrole_CB_${randomPostfix}`,
        collegeRoleNameA: `AT_C514892_Userrole_M1A_${randomPostfix}`,
        collegeRoleNameB: `AT_C514892_Userrole_M1B_${randomPostfix}`,
        universityRoleNameA: `AT_C514892_Userrole_M2A_${randomPostfix}`,
        universityRoleNameB: `AT_C514892_Userrole_M2B_${randomPostfix}`,
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.rolesUsers,
        CapabilitySets.uiUsersRolesView,
      ];

      const capabsToAssign = [
        Capabilities.settingsEnabled,
        Capabilities.consortiaUserTenantsCollection,
      ];

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((tempUserProperties) => {
          cy.createTempUser([]).then((testUserProperties) => {
            testData.tempUser = tempUserProperties;
            testData.testUser = testUserProperties;
            cy.assignAffiliationToUser(Affiliations.College, testData.tempUser.userId);
            cy.assignAffiliationToUser(Affiliations.University, testData.tempUser.userId);
            cy.assignAffiliationToUser(Affiliations.College, testData.testUser.userId);
            cy.assignAffiliationToUser(Affiliations.University, testData.testUser.userId);
            cy.assignCapabilitiesToExistingUser(
              testData.tempUser.userId,
              capabsToAssign,
              capabSetsToAssign,
            );
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
            cy.createAuthorizationRoleApi(testData.centralRoleNameA).then((roleCA) => {
              testData.roleCAId = roleCA.id;
            });
            cy.createAuthorizationRoleApi(testData.centralRoleNameB).then((roleCB) => {
              testData.roleCBId = roleCB.id;
            });
            // need to wait for user policy creation to finish
            cy.wait(10000);
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(
              testData.tempUser.userId,
              capabsToAssign,
              capabSetsToAssign,
            );
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
            cy.createAuthorizationRoleApi(testData.collegeRoleNameA).then((roleM1A) => {
              testData.roleM1AId = roleM1A.id;
            });
            cy.createAuthorizationRoleApi(testData.collegeRoleNameB).then((roleM1B) => {
              testData.roleM1BId = roleM1B.id;
            });
            // need to wait for user policy creation to finish
            cy.wait(10000);
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(
              testData.tempUser.userId,
              capabsToAssign,
              capabSetsToAssign,
            );
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
            cy.createAuthorizationRoleApi(testData.universityRoleNameA).then((roleM2A) => {
              testData.roleM2AId = roleM2A.id;
            });
            cy.createAuthorizationRoleApi(testData.universityRoleNameB).then((roleM2B) => {
              testData.roleM2BId = roleM2B.id;
            });
          });
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.getAdminToken();
        if (Cypress.env('runAsAdmin')) cy.deleteRolesForUserApi(testData.testUser.userId);
        cy.login(testData.tempUser.username, testData.tempUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
          authRefresh: true,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        UsersSearchPane.searchByUsername(testData.testUser.username);
      });

      after('Delete roles, users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(testData.roleCAId);
        cy.deleteAuthorizationRoleApi(testData.roleCBId);
        Users.deleteViaApi(testData.testUser.userId);
        Users.deleteViaApi(testData.tempUser.userId);
        cy.setTenant(Affiliations.College);
        cy.deleteAuthorizationRoleApi(testData.roleM1AId);
        cy.deleteAuthorizationRoleApi(testData.roleM1BId);
        cy.setTenant(Affiliations.University);
        cy.deleteAuthorizationRoleApi(testData.roleM2AId);
        cy.deleteAuthorizationRoleApi(testData.roleM2BId);
      });

      it(
        'C514892 Assigned roles shown in user detailed view on Central, Member tenants (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C514892'] },
        () => {
          UsersSearchPane.selectUserFromList(testData.testUser.username);
          UsersCard.verifyUserRolesCounter('0');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRolesAccordionEmpty();

          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            SETTINGS_SUBSECTION_AUTH_ROLES,
          );
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.searchRole(testData.centralRoleNameA);
          AuthorizationRoles.clickOnRoleName(testData.centralRoleNameA, false);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.testUser.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUser(
            testData.testUser.lastName,
            testData.testUser.firstName,
          );
          AuthorizationRoles.searchRole(testData.centralRoleNameB);
          AuthorizationRoles.clickOnRoleName(testData.centralRoleNameB, false);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.testUser.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUser(
            testData.testUser.lastName,
            testData.testUser.firstName,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          UsersSearchPane.resetAllFilters();
          UsersSearchPane.searchByUsername(testData.testUser.username);
          UsersSearchPane.selectUserFromList(testData.testUser.username);
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRolesAccordionEmpty();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          Users.waitLoading();
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            SETTINGS_SUBSECTION_AUTH_ROLES,
          );
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.searchRole(testData.collegeRoleNameA);
          AuthorizationRoles.clickOnRoleName(testData.collegeRoleNameA, false);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.testUser.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUser(
            testData.testUser.lastName,
            testData.testUser.firstName,
          );
          AuthorizationRoles.searchRole(testData.collegeRoleNameB);
          AuthorizationRoles.clickOnRoleName(testData.collegeRoleNameB, false);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.testUser.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUser(
            testData.testUser.lastName,
            testData.testUser.firstName,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(testData.testUser.username);
          UsersSearchPane.clickOnUserRowContaining(testData.testUser.username);
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRolesAccordionEmpty();

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          Users.waitLoading();
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            SETTINGS_SUBSECTION_AUTH_ROLES,
          );
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.searchRole(testData.universityRoleNameA);
          AuthorizationRoles.clickOnRoleName(testData.universityRoleNameA, false);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.testUser.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUser(
            testData.testUser.lastName,
            testData.testUser.firstName,
          );
          AuthorizationRoles.searchRole(testData.universityRoleNameB);
          AuthorizationRoles.clickOnRoleName(testData.universityRoleNameB, false);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.testUser.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUser(
            testData.testUser.lastName,
            testData.testUser.firstName,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(testData.testUser.username);
          UsersSearchPane.clickOnUserRowContaining(testData.testUser.username);
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameB,
          ]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
        },
      );
    });
  });
});
