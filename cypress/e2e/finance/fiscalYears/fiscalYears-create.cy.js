import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('ui-finance: Fiscal Year', () => {
  before(() => {
    cy.loginAsAdmin();
    cy.visit(TopMenu.fiscalYearPath);
  });

  it('C4051 Create a new fiscal year (thunderjet)', { tags: ['smoke', 'thunderjet'] }, () => {
    const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };
    FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
    FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
    FiscalYears.deleteFiscalYearViaActions();

    // should not create fund without mandatory fields
    const testFiscalYearName = `autotest_year_${getRandomPostfix()}`;
    FiscalYears.tryToCreateFiscalYearWithoutMandatoryFields(testFiscalYearName);
    FinanceHelp.searchByName(testFiscalYearName);
    FiscalYears.checkZeroSearchResultsHeader();
  });
});
