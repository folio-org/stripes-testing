import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';

describe('fse-finance - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195278 - verify that finance-fiscal year is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'finance'] },
    () => {
      cy.visit(TopMenu.fiscalYearPath);
      FiscalYears.verifyFiltersSectionIsDisplayed();
    },
  );
});
