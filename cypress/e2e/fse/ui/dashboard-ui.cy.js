import TopMenu from '../../../support/fragments/topMenu';
import Dashboard from '../../../support/fragments/dashboard/dashboard';

describe('fse-dashboard - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195287 - verify that dashboard module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'dashboard'] },
    () => {
      cy.visit(TopMenu.dashboardPath);
      Dashboard.waitLoading();
    },
  );
});
