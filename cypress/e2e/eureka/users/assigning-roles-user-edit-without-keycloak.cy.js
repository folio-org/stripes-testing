import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Eureka', () => {
  describe('Users', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleAName: `Auto Role A C627437 ${randomPostfix}`,
      roleBName: `Auto Role B C627437 ${randomPostfix}`,
      promotePath: '/users-keycloak/auth-users',
      userBody: {
        type: 'staff',
        active: true,
        username: `userc627437${randomPostfix}`,
        patronGroup: '',
        personal: {
          lastName: `Last c627437 ${randomPostfix}`,
          firstName: `First c627437 ${randomPostfix}`,
          email: 'testuser@test.org',
          preferredContactTypeId: '002',
        },
      },
    };

    const capabSetsToAssign = [{ type: 'Data', resource: 'UI-Users Roles', action: 'Manage' }];

    const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

    before('Create users, roles', () => {
      cy.getAdminToken();
      cy.getUserGroups().then(() => {
        testData.userBody.patronGroup = Cypress.env('userGroups')[0].id;
        cy.createUserWithoutKeycloakInEurekaApi(testData.userBody).then((userId) => {
          testData.userId = userId;
        });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.tempUser = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.tempUser.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
        });
        cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
          testData.roleAId = role.id;
        });
        cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
          testData.roleBId = role.id;
        });
      });
    });

    before('Login', () => {
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      Users.deleteViaApi(testData.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C627437 [UIU-3301] Assigning roles to a user without Keycloak record when editing user while having ui-users.roles - Manage (eureka)',
      { tags: ['smoke', 'eureka', 'shiftLeft', 'C627437'] },
      () => {
        UsersSearchPane.searchByKeywords(testData.userBody.username);
        UsersSearchPane.selectUserFromList(testData.userBody.username);
        UsersCard.verifyUserLastFirstNameInCard(
          testData.userBody.personal.lastName,
          testData.userBody.personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('0');
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter('0');
        UserEdit.clickUserRolesAccordion();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        UserEdit.selectRoleInModal(testData.roleAName);
        UserEdit.selectRoleInModal(testData.roleBName);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNames([testData.roleAName, testData.roleAName]);
        UserEdit.verifyUserRolesRowsCount(2);
        UserEdit.saveUserEditForm();
        UserEdit.checkPromoteUserModal(
          testData.userBody.personal.lastName,
          testData.userBody.personal.firstName,
        );
        UserEdit.clickCancelInPromoteUserModal();
        UsersCard.verifyUserLastFirstNameInCard(
          testData.userBody.personal.lastName,
          testData.userBody.personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('0');

        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter('0');
        UserEdit.clickUserRolesAccordion();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        UserEdit.selectRoleInModal(testData.roleAName);
        UserEdit.selectRoleInModal(testData.roleBName);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNames([testData.roleAName, testData.roleBName]);
        UserEdit.verifyUserRolesRowsCount(2);
        UserEdit.saveUserEditForm();
        UserEdit.checkPromoteUserModal(
          testData.userBody.personal.lastName,
          testData.userBody.personal.firstName,
        );
        cy.intercept(`${testData.promotePath}/${testData.userId}`).as('promote');
        UserEdit.clickConfirmInPromoteUserModal();
        cy.wait('@promote').its('response.statusCode').should('eq', 201);
        UsersCard.verifyUserLastFirstNameInCard(
          testData.userBody.personal.lastName,
          testData.userBody.personal.firstName,
        );
        UsersCard.close();
        UsersSearchPane.selectUserFromList(testData.userBody.username);
        UsersCard.verifyUserRolesCounter('2');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleAName, testData.roleBName]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleAName);
        AuthorizationRoles.clickOnRoleName(testData.roleAName, false);
        AuthorizationRoles.verifyAssignedUser(
          testData.userBody.personal.lastName,
          testData.userBody.personal.firstName,
        );

        AuthorizationRoles.searchRole(testData.roleBName);
        AuthorizationRoles.clickOnRoleName(testData.roleBName, false);
        AuthorizationRoles.verifyAssignedUser(
          testData.userBody.personal.lastName,
          testData.userBody.personal.firstName,
        );
      },
    );
  });
});
