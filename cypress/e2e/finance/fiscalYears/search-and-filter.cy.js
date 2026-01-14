import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Fiscal Year', () => {
  const defaultFiscalYear = {
    ...FiscalYears.defaultUiFiscalYear,
    name: `1autotest_year_${getRandomPostfix()}`,
  };

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
    });
    cy.loginAsAdmin({
      path: TopMenu.fiscalYearPath,
      waiter: FiscalYears.waitForFiscalYearDetailsLoading,
    });
  });

  after(() => {
    cy.getAdminToken();
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
  });

  it(
    'C4058 Test the search and filter options for fiscal years (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C4058'] },
    () => {
      // Search Fiscal Year
      FinanceHelp.searchByAll(defaultFiscalYear.name);
      FiscalYears.checkSearchResults(defaultFiscalYear.name);
      FiscalYears.resetFilters();
      FinanceHelp.searchByName(defaultFiscalYear.name);
      FiscalYears.checkSearchResults(defaultFiscalYear.name);
      FiscalYears.resetFilters();
      FinanceHelp.searchByCode(defaultFiscalYear.code);
      FiscalYears.checkSearchResults(defaultFiscalYear.name);
      FiscalYears.resetFilters();
      // Filter Fiscal Year
      FiscalYears.openAcquisitionAccordion();
      FiscalYears.selectAcquisitionUnitFilter('No acquisition unit');
      FiscalYears.checkSearchResults(defaultFiscalYear.name);
      FiscalYears.resetFilters();
      // Search and Filter Fiscal Year
      FinanceHelp.searchByAll(defaultFiscalYear.name);
      FiscalYears.selectAcquisitionUnitFilter('No acquisition unit');
      FiscalYears.expectFY(defaultFiscalYear.name);
    },
  );
});
