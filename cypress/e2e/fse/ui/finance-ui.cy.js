import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';

describe('fse-finance - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.fiscalYearPath,
      waiter: FiscalYears.verifyFiltersSectionIsDisplayed,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195278 - verify that finance-fiscal year is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'finance'] },
    () => {
      FiscalYears.waitLoading();
      // run basic search
      FiscalYears.searchByName('F');
      FiscalYears.fiscalYearsDisplay();
    },
  );
});
