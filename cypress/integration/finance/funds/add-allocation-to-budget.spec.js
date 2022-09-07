import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import NewLedger from '../../../support/fragments/finance/ledgers/newLedger';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';


describe('ui-finance: Add budget to fund', () => {
  const firstExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const defaultfund = Funds.defaultUiFund;
  const defaultFiscalYear = FiscalYears.defaultUiFiscalYear;
  const defaultLedger = { ...Ledgers.defaultUiLedger };

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear)
      .then(response => {
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

        Ledgers.createViaApi(defaultLedger)
          .then(ledgerResponse => {
            defaultLedger.id = ledgerResponse.id;
            defaultfund.ledgerId = defaultLedger.id;
            defaultfund.ledgerName = defaultLedger.name;

            Funds.createViaApi(defaultfund)
              .then(fundResponse => {
                defaultfund.id = fundResponse.fund.id;
              });
            // console.log(response);
            // console.log(defaultFiscalYear.id);
          });
      });
    cy.loginAsAdmin();
    // console.log(defaultFiscalYear.id);
    // cy.loginAsAdmin();
    // cy.visit(SettingsMenu.expenseClassesPath);
    // SettingsFinance.createNewExpenseClass(firstExpenseClass);

    // cy.visit(TopMenu.fiscalYearPath);
    // FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
    // FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);

    // cy.visit(TopMenu.ledgerPath);
    // Ledgers.createDefaultLedger(defaultLedger);
    // Ledgers.checkCreatedLedgerName(defaultLedger);

    // Funds.createFundViaUI(fund)
    //   .then(
    //     () => {
    //       Funds.addBudget(100);
    //       Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
    //     }
    //   );
  });

  after(() => {
    // Funds.deleteFundViaApi(defaultfund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    // Funds.editBudget();
    // Funds.deleteExpensesClass();
    // Funds.deleteBudgetViaActions();
    // Funds.deleteFundViaActions();

    // cy.visit(SettingsMenu.expenseClassesPath);
    // SettingsFinance.deleteExpenseClass(firstExpenseClass);

    // cy.visit(TopMenu.fiscalYearPath);
    // FinanceHelp.searchByName(defaultFiscalYear.name);
    // FinanceHelp.selectFromResultsList();
    // FiscalYears.deleteFiscalYearViaActions();
  });

  it('C6649 Add allocation to a budget by creating an allocation transaction (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.fiscalYearPath);
    cy.pause();
    console.log(defaultLedger.id);
  });
});
