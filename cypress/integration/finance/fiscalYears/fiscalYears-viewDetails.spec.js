import TopMenu from '../../../support/fragments/topMenu';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import devTeams from '../../../support/dictionary/devTeams';

describe('ui-finance: Fiscal Year creation', () => {
  const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };
  before(() => {
    cy.loginAsAdmin();
    cy.visit(TopMenu.fiscalYearPath);
    FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
    FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);
  });

  after(() => {
    FiscalYears.deleteFiscalYearViaActions();
  });

  it('C3452: View fiscal year details (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.fiscalYearPath);
    FiscalYears.fiscalYearsDisplay();
    FinanceHelp.searchByName(defaultFiscalYear.name);
    FinanceHelp.selectFromResultsList();
    FiscalYears.fiscalYearDetailView();
  });
});
