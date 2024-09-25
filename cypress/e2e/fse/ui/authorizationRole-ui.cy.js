import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('fse-authorization-role - create/edit/assign/delete new authorization role for non-live tenants', () => {
  const testData = {
    roleName: `Auto Role FSE TEST ${getRandomPostfix()}`,
    roleDescription: `Description FSE TEST ${getRandomPostfix()}`,
    updatedRoleName: `Auto Role FSE TEST ${getRandomPostfix()} updated`,
    updatedRoleDescription: `Description FSE TEST ${getRandomPostfix()} updated`,
  };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // create temp user for testing purposes
    cy.createTempUser([]).then((createdUserProperties) => {
      testData.user = createdUserProperties;
    });
    // login as admin
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  afterEach('Delete user and role', () => {
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    Users.deleteViaApi(testData.user.userId);
    cy.deleteAuthorizationRoleApi(testData.roleId);
  });

  it(
    `TC195565 - verify authorization role creation and editing for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['non-live', 'fse', 'ui', 'authorization-role'] },
    () => {
      cy.visit(TopMenu.settingsAuthorizationRoles);
      AuthorizationRoles.waitContentLoading();
      // create new role
      AuthorizationRoles.clickNewButton();
      AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
      AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
      AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
      cy.intercept('POST', '/roles*').as('roles');
      AuthorizationRoles.clickSaveButton();
      cy.wait('@roles').then((res) => {
        expect(res.response.body.name).to.eq(testData.roleName);
        expect(res.response.body.description).to.eq(testData.roleDescription);
        testData.roleId = res.response.body.id;
        cy.wait(2000);
      });
      AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
      // edit created role
      AuthorizationRoles.searchRole(testData.roleName);
      AuthorizationRoles.clickOnRoleName(testData.roleName);
      AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
      cy.reload();
      AuthorizationRoles.openForEdit();
      AuthorizationRoles.fillRoleNameDescription(
        testData.updatedRoleName,
        testData.updatedRoleDescription,
      );
      cy.wait(2000);
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(
        testData.updatedRoleName,
        testData.updatedRoleDescription,
      );
      AuthorizationRoles.clickOnCapabilitySetsAccordion(false);
      AuthorizationRoles.clickOnCapabilitiesAccordion(false);
      AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
      AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
      // check role deletion pop-up
      AuthorizationRoles.clickDeleteRole();
      AuthorizationRoles.cancelDeleteRole(testData.updatedRoleName);
    },
  );

  it(
    `TC195566 - assign authorization role for newly created user ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['non-live', 'fse', 'ui', 'authorization-role'] },
    () => {
      cy.visit(TopMenu.settingsAuthorizationRoles);
      AuthorizationRoles.waitContentLoading();
      // create new role
      AuthorizationRoles.clickNewButton();
      AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
      AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
      AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
      cy.intercept('POST', '/roles*').as('roles');
      AuthorizationRoles.clickSaveButton();
      cy.wait('@roles').then((res) => {
        expect(res.response.body.name).to.eq(testData.roleName);
        expect(res.response.body.description).to.eq(testData.roleDescription);
        testData.roleId = res.response.body.id;
        cy.wait(2000);
      });
      AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);

      AuthorizationRoles.searchRole(testData.roleName);
      AuthorizationRoles.clickOnRoleName(testData.roleName);
      AuthorizationRoles.clickAssignUsersButton();
      cy.wait(3000);
      AuthorizationRoles.selectUserInModal(testData.user.username);
      AuthorizationRoles.clickSaveInAssignModal();
      AuthorizationRoles.verifyAssignedUser(testData.user.lastName, testData.user.firstName);
      // check users module
      cy.visit(TopMenu.usersPath);
      Users.waitLoading();
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersSearchPane.selectUserFromList(testData.user.username);
      UsersCard.verifyUserRolesCounter('1');
      UsersCard.clickUserRolesAccordion();
      UsersCard.verifyUserRoleNames([testData.roleName]);
    },
  );
});
