import TopMenu from '../../../support/fragments/topMenu';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import getRandomPostfix from '../../../support/utils/stringTools';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import devTeams from '../../../support/dictionary/devTeams';

describe('ui-finance: Fiscal Year', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.fiscalYearPath);
  });

  it(
    'C4051 Create a new fiscal year (thunderjet)',
    { tags: [testType.smoke, devTeams.thunderjet] },
    () => {
      const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };
      FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
      FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
      FiscalYears.deleteFiscalYearViaActions();

      // should not create fund without mandatory fields
      const testFiscalYearName = `autotest_year_${getRandomPostfix()}`;
      FiscalYears.tryToCreateFiscalYearWithoutMandatoryFields(testFiscalYearName);
      FinanceHelp.searchByName(testFiscalYearName);
      FiscalYears.checkZeroSearchResultsHeader();
    },
  );
});
