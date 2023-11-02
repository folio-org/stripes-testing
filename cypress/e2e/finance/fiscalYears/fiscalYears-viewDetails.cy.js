import TopMenu from '../../../support/fragments/topMenu';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import devTeams from '../../../support/dictionary/devTeams';

describe('ui-finance: Fiscal Year', () => {
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
    'C3452: View fiscal year details (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FiscalYears.fiscalYearsDisplay();
      FinanceHelp.searchByName(defaultFiscalYear.name);
      FiscalYears.selectFY(defaultFiscalYear.name);
      FiscalYears.fiscalYearDetailView();
    },
  );
});
