import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';
import Modals from '../../../../support/fragments/modals';
import UsersSearchResultsPane from '../../../../support/fragments/users/usersSearchResultsPane';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Users', () => {
    const { user, memberTenant } = parseSanityParameters();

    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C584520_UserRole_${randomPostfix}`,
      promotePath: '/users-keycloak/auth-users',
      errorCalloutText: 'Something went wrong. Please try again later.',
      patronGroupName: `AT_C584520_UserGroup_${getRandomLetters(7)}`,
    };
    const userBodies = [];
    const userIds = [];

    before('Create users, roles', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      cy.then(() => {
        cy.createUserGroupApi({
          groupName: testData.patronGroupName,
          expirationOffsetInDays: 365,
        }).then((patronGroupBody) => {
          testData.patronGroupId = patronGroupBody.id;
          for (let i = 1; i < 4; i++) {
            userBodies.push({
              type: 'staff',
              active: true,
              username: `at_c584520_username_${i}_${randomPostfix}`,
              patronGroup: testData.patronGroupId,
              personal: {
                lastName: `AT_C584520_LastName_${i}_${randomPostfix}`,
                firstName: `AT_C584520_FirstName_${i}_${randomPostfix}`,
                email: 'AT_C584520@test.com',
                preferredContactTypeId: '002',
              },
            });
          }
          delete userBodies[1].username;
          cy.ifConsortia(true, () => {
            userBodies[1].type = 'patron';
          });
          cy.createUserWithoutKeycloakInEurekaApi(userBodies[0]).then((userId) => {
            userIds.push(userId);
          });
          cy.createUserWithoutKeycloakInEurekaApi(userBodies[1]).then((userId) => {
            userIds.push(userId);
          });
          Users.createViaApi(userBodies[2]).then((userData) => {
            userIds.push(userData.id);
          });

          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
          });
        });
      });
    });

    before('Login', () => {
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
        authRefresh: true,
      });
      cy.allure().logCommandSteps();
      Users.waitLoading();
    });

    after('Delete roles, users', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();
      cy.deleteAuthorizationRoleApi(testData.roleId);
      userIds.forEach((id) => {
        Users.deleteViaApi(id);
      });
      cy.deleteUserGroupApi(testData.patronGroupId, true);
    });

    it(
      'C584520 Assigning role to users with/without Keycloak record when editing user (eureka)',
      { tags: ['dryRun', 'eureka', 'C584520'] },
      () => {
        UsersSearchPane.searchByKeywords(userBodies[0].username);
        UsersSearchPane.clickOnUserRowContaining(userBodies[0].username);
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
        cy.intercept('GET', '/users?limit=*').as('getUsers1');
        UserEdit.clickConfirmInPromoteUserModal();
        cy.wait('@promoteA').its('response.statusCode').should('eq', 201);
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        cy.wait('@getUsers1').its('response.statusCode').should('eq', 200);
        UsersSearchPane.resetAllFilters();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();
        UsersSearchPane.searchByKeywords(userBodies[0].username);
        UsersSearchPane.clickOnUserRowContaining(userBodies[0].username);
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[0].personal.lastName,
          userBodies[0].personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('1');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleName]);

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

        UsersSearchPane.searchByKeywords(userBodies[2].username);
        UsersSearchPane.clickOnUserRowContaining(userBodies[2].username);
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

        // workaround for issue UIU-3390
        cy.intercept('GET', '/users?limit=*').as('getUsers2');
        Modals.closeModalWithEscapeIfAny();

        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[2].personal.lastName,
          userBodies[2].personal.firstName,
        );
        cy.wait('@getUsers2').its('response.statusCode').should('eq', 200);
        UsersSearchPane.resetAllFilters();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();
        UsersSearchPane.searchByKeywords(userBodies[2].username);
        UsersSearchPane.clickOnUserRowContaining(userBodies[2].username);
        UsersCard.verifyUserLastFirstNameInCard(
          userBodies[2].personal.lastName,
          userBodies[2].personal.firstName,
        );
        UsersCard.verifyUserRolesCounter('1');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleName]);

        cy.visit(TopMenu.settingsAuthorizationRoles);
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
