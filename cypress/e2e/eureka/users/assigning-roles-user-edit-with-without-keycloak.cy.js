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
import InteractorsTools from '../../../support/utils/interactorsTools';
import Modals from '../../../support/fragments/modals';

describe('Eureka', () => {
  describe('Users', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `Auto Role C584520 ${randomPostfix}`,
      promotePath: '/users-keycloak/auth-users',
      errorCalloutText: 'Something went wrong. Please try again later.',
    };
    const userBodies = [];
    const userIds = [];

    const capabSetsToAssign = [
      { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
      { type: 'Data', resource: 'Roles Users', action: 'Manage' },
      { type: 'Data', resource: 'UI-Users', action: 'View' },
      { type: 'Data', resource: 'UI-Users Roles', action: 'Manage' },
    ];

    const capabsToAssign = [
      { type: 'Settings', resource: 'Settings Enabled', action: 'View' },
      { type: 'Data', resource: 'Users-Keycloak Auth-Users Item', action: 'View' },
      { type: 'Data', resource: 'Users-Keycloak Auth-Users Item', action: 'Create' },
    ];

    before('Create users, roles', () => {
      cy.getAdminToken().then(() => {
        cy.getUserGroups().then(() => {
          for (let i = 1; i < 4; i++) {
            userBodies.push({
              type: 'staff',
              active: true,
              username: `user${i}c584520${randomPostfix}`,
              patronGroup: Cypress.env('userGroups')[0].id,
              personal: {
                lastName: `Last ${i} c584520${randomPostfix}`,
                firstName: `First ${i} c584520${randomPostfix}`,
                email: 'testuser@test.org',
                preferredContactTypeId: '002',
              },
            });
          }
          if (!Cypress.env('OKAPI_TENANT').includes('int_0')) delete userBodies[1].username;
          cy.createUserWithoutKeycloakInEurekaApi(userBodies[0]).then((userId) => {
            userIds.push(userId);
          });
          cy.createUserWithoutKeycloakInEurekaApi(userBodies[1]).then((userId) => {
            userIds.push(userId);
          });
          Users.createViaApi(userBodies[2]).then((user) => {
            userIds.push(user.id);
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
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
          });
        });
      });
    });

    before('Login', () => {
      cy.waitForAuthRefresh(() => {
        cy.login(testData.tempUser.username, testData.tempUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
      }, 20_000);
      Users.waitLoading();
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      cy.deleteAuthorizationRoleApi(testData.roleId);
      userIds.forEach((id) => {
        Users.deleteViaApi(id);
      });
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C584520 Assigning role to users with/without Keycloak record when editing user (eureka)',
      { tags: ['smoke', 'eureka', 'C584520'] },
      () => {
        UsersSearchPane.searchByKeywords(userBodies[0].username);
        UsersSearchPane.selectUserFromList(userBodies[0].username);
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('0');
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter('0');
        UserEdit.clickUserRolesAccordion();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        UserEdit.selectRoleInModal(testData.roleName);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNames([testData.roleName]);
        UserEdit.verifyUserRolesRowsCount(1);
        UserEdit.saveUserEditForm();
        UserEdit.checkPromoteUserModal(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        UserEdit.clickCancelInPromoteUserModal();
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('0');

        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter('0');
        UserEdit.clickUserRolesAccordion();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        UserEdit.selectRoleInModal(testData.roleName);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNames([testData.roleName]);
        UserEdit.verifyUserRolesRowsCount(1);
        UserEdit.saveUserEditForm();
        UserEdit.checkPromoteUserModal(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        cy.intercept(`${testData.promotePath}/${userIds[0]}`).as('promoteA');
        UserEdit.clickConfirmInPromoteUserModal();
        cy.wait('@promoteA').its('response.statusCode').should('eq', 201);
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        UsersCard.close();
        UsersSearchPane.selectUserFromList(userBodies[0].username);
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('1');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleName]);

        if (!Cypress.env('OKAPI_TENANT').includes('int_0')) {
          UsersSearchPane.resetAllFilters();
          UsersSearchPane.searchByKeywords(
            `${userBodies[1].personal.lastName}, ${userBodies[1].personal.firstName}`,
          );
          UsersSearchPane.clickOnUserRowContaining(
            `${userBodies[1].personal.lastName}, ${userBodies[1].personal.firstName}`,
          );
          UsersCard.verifyUserLastFirstNameInCard(
            userBodies[1].personal.lastName,
            userBodies[1].personal.firstName,
          );
          UsersCard.verifyUserRolesCounter('0');
          UserEdit.openEdit();
          UserEdit.verifyUserRolesCounter('0');
          UserEdit.clickUserRolesAccordion();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.roleName);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.roleName]);
          UserEdit.verifyUserRolesRowsCount(1);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(
            userBodies[1].personal.lastName,
            userBodies[1].personal.firstName,
          );
          UserEdit.clickConfirmInPromoteUserModal(false);
          InteractorsTools.checkCalloutErrorMessage(testData.errorCalloutText);
          InteractorsTools.dismissCallout(testData.errorCalloutText);
          UserEdit.clickCancelInPromoteUserModal();
          UsersCard.verifyUserLastFirstNameInCard(
            userBodies[1].personal.lastName,
            userBodies[1].personal.firstName,
          );
          UsersCard.verifyUserRolesCounter('0');
        }

        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(userBodies[2].username);
        UsersSearchPane.selectUserFromList(userBodies[2].username);
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[2].personal.lastName,
          userBodies[2].personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('0');
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter('0');
        UserEdit.clickUserRolesAccordion();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        UserEdit.selectRoleInModal(testData.roleName);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNames([testData.roleName]);
        UserEdit.verifyUserRolesRowsCount(1);
        UserEdit.saveUserEditForm();
        Modals.closeModalWithEscapeKeyIfAny();
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[2].personal.lastName,
          userBodies[2].personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('1');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleName]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.verifyAssignedUser(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
          true,
        );
        AuthorizationRoles.verifyAssignedUser(
          userBodies[1].personal.lastName,
          userBodies[1].personal.firstName,
          false,
        );
        AuthorizationRoles.verifyAssignedUser(
          userBodies[2].personal.lastName,
          userBodies[2].personal.firstName,
          true,
        );
      },
    );
  });
});
