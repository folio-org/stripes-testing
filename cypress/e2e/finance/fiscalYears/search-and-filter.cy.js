import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';

describe('ui-finance: Fiscal Year', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };

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
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
  });

  it(
    'C4058: Test the search and filter options for fiscal years (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
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
      FiscalYears.expextFY(defaultFiscalYear.name);
    },
  );
});
