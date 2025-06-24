import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import TopMenu from '../../../support/fragments/topMenu';

describe('Fiscal Year', () => {
  const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };
  before(() => {
    cy.loginAsAdmin();
    cy.visit(TopMenu.fiscalYearPath);
    FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
    FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
    FiscalYears.closeThirdPane();
  });

  after(() => {
    FiscalYears.deleteFiscalYearViaActions();
  });

  it(
    'C3452 View fiscal year details (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      FiscalYears.fiscalYearsDisplay();
      FinanceHelp.searchByName(defaultFiscalYear.name);
      FiscalYears.selectFY(defaultFiscalYear.name);
      FiscalYears.fiscalYearDetailView();
    },
  );
});
