import TopMenu from '../../../support/fragments/topMenu';
import ErmUsage from '../../../support/fragments/erm-usage/ermUsage';

describe('fse-erm-usage - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195310 - verify that erm-usage module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'folio_erm-usage'] },
    () => {
      cy.visit(TopMenu.ermUsagePath);
      ErmUsage.waitLoading();
    },
  );
});
