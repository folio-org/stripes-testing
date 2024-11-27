/* eslint-disable no-unused-vars */
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

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleNameA: `Role CA C514899 ${randomPostfix}`,
        collegeRoleNameA: `Role M1A C514899 ${randomPostfix}`,
        collegeRoleNameB: `Role M1B C514899 ${randomPostfix}`,
        universityRoleNameA: `Role M2A C514899 ${randomPostfix}`,
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Roles Users', action: 'Manage' },
        { type: 'Data', resource: 'UI-Users', action: 'View' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

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
          });
        });
      });

      before('Assign roles, login', () => {
        cy.resetTenant();
        cy.getAdminToken();
        if (Cypress.env('runAsAdmin')) cy.deleteRolesForUserApi(testData.testUser.userId);
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.testUser.userId, [testData.roleCAId]);
        else cy.addRolesToNewUserApi(testData.testUser.userId, [testData.roleCAId]);
        cy.wait(10000);
        cy.setTenant(Affiliations.College);
        if (Cypress.env('runAsAdmin')) cy.deleteRolesForUserApi(testData.testUser.userId);
        if (Cypress.env('runAsAdmin')) {
          cy.updateRolesForUserApi(testData.testUser.userId, [
            testData.roleM1AId,
            testData.roleM1BId,
          ]);
        } else {
          cy.addRolesToNewUserApi(testData.testUser.userId, [
            testData.roleM1AId,
            testData.roleM1BId,
          ]);
        }
        cy.wait(10000);
        cy.setTenant(Affiliations.University);
        if (Cypress.env('runAsAdmin')) cy.deleteRolesForUserApi(testData.testUser.userId);
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.testUser.userId, [testData.roleM2AId]);
        else cy.addRolesToNewUserApi(testData.testUser.userId, [testData.roleM2AId]);
        cy.login(testData.tempUser.username, testData.tempUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
        UsersSearchPane.searchByUsername(testData.testUser.username);
      });

      after('Delete roles, users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(testData.roleCAId);
        Users.deleteViaApi(testData.testUser.userId);
        Users.deleteViaApi(testData.tempUser.userId);
        cy.setTenant(Affiliations.College);
        cy.deleteAuthorizationRoleApi(testData.roleM1AId);
        cy.deleteAuthorizationRoleApi(testData.roleM1BId);
        cy.setTenant(Affiliations.University);
        cy.deleteAuthorizationRoleApi(testData.roleM2AId);
      });

      it(
        'C514899 Unassigned roles not shown in user detailed view on Central, Member tenants (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C514899'] },
        () => {
          UsersSearchPane.selectUserFromList(testData.testUser.username);
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.verifyUserRoleNames([testData.roleCAId]);

          // UsersSearchPane.searchByUsername(testData.userA.username);
          // UsersSearchPane.selectUserFromList(testData.userA.username);
          // UsersCard.verifyUserRolesCounter('0');
          // UsersCard.clickUserRolesAccordion();
          // UsersCard.verifyUserRolesAccordionEmpty();

          // TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
          // AuthorizationRoles.waitContentLoading();
          // AuthorizationRoles.searchRole(testData.roleAName);
          // AuthorizationRoles.clickOnRoleName(testData.roleAName);
          // AuthorizationRoles.clickAssignUsersButton();
          // AuthorizationRoles.selectUserInModal(testData.userA.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);

          // AuthorizationRoles.searchRole(testData.roleBName);
          // AuthorizationRoles.clickOnRoleName(testData.roleBName);
          // AuthorizationRoles.clickAssignUsersButton();
          // AuthorizationRoles.selectUserInModal(testData.userA.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);

          // TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          // Users.waitLoading();
          // UsersSearchPane.resetAllFilters();
          // UsersSearchPane.searchByUsername(testData.userA.username);
          // cy.wait(3000);
          // UsersSearchPane.selectUserFromList(testData.userA.username);
          // UsersCard.verifyUserRolesCounter('2');
          // UsersCard.clickUserRolesAccordion();
          // UsersCard.verifyUserRoleNames([testData.roleAName, testData.roleBName]);
        },
      );
    });
  });
});
