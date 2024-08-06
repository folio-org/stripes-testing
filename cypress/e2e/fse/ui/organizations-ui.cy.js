import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';

describe('fse-organizations - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195376 - verify that organizations page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'organizations'] },
    () => {
      cy.visit(TopMenu.organizationsPath);
      Organizations.waitLoading();
    },
  );
});
