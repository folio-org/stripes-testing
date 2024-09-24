import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('fse-authorization-role - create new authorization role for non-live tenants', () => {
  const testData = {
    roleName: `Auto Role TCXXXXX ${getRandomPostfix()}`,
    roleDescription: `Description ${getRandomPostfix()}`,
    updatedRoleName: `Auto Role TCXXXX ${getRandomPostfix()} updated`,
    updatedRoleDescription: `Description TCXXXX ${getRandomPostfix()} updated`,
  };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TCXXXXX - verify authorization role creation and editing for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['non-live', 'fse', 'ui', 'authorization-role'] },
    () => {
      cy.visit(TopMenu.settingsAuthorizationRoles);
      AuthorizationRoles.waitContentLoading();
      // create new role
      AuthorizationRoles.clickNewButton();
      AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
      AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
      AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
      // edit created role
      AuthorizationRoles.searchRole(testData.roleName);
      AuthorizationRoles.clickOnRoleName(testData.roleName);
      AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
      AuthorizationRoles.openForEdit();
      AuthorizationRoles.fillRoleNameDescription(
        testData.updatedRoleName,
        testData.updatedRoleDescription,
      );
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(
        testData.updatedRoleName,
        testData.updatedRoleDescription,
      );
      AuthorizationRoles.clickOnCapabilitySetsAccordion(false);
      AuthorizationRoles.clickOnCapabilitiesAccordion(false);
      AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
      AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
      // delete created role
      AuthorizationRoles.clickDeleteRole();
      AuthorizationRoles.cancelDeleteRole(testData.roleName);
      AuthorizationRoles.clickDeleteRole();
      AuthorizationRoles.confirmDeleteRole(testData.roleName);
    },
  );
});
