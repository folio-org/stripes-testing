import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../../support/utils/interactorsTools';


describe('ui-finance: Add budget to fund', () => {
  const defaultfund = Funds.defaultUiFund;
  const defaultFiscalYear = FiscalYears.defaultUiFiscalYear;
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultBudget = Funds.defaultUiBudget;
  let user;

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

            Funds.createViaApi(defaultfund)
              .then(fundResponse => {
                defaultfund.id = fundResponse.fund.id;
                defaultBudget.fiscalYearId = defaultFiscalYear.id;
                defaultBudget.fundId = defaultfund.id;
                defaultBudget.name = `${defaultfund.code}-${defaultFiscalYear.code}`;
                Funds.addBudgetToFundViaApi(defaultBudget)
                  .then(budgetResponse => {
                    defaultBudget.id = budgetResponse.id;
                  });
              });
          });
      });
    cy.loginAsAdmin();

    // console.log(defaultBudget);
    // cy.createTempUser([
    //   permissions.uiFinanceCreateAllocations.gui,
    // ])
    //   .then(userProperties => {
    //     user = userProperties;
    //     cy.login(userProperties.username, userProperties.password);
    //   });
  });

  after(() => {
    Funds.deleteBudgetViaApi(defaultBudget.id);
    Funds.deleteFundViaApi(defaultfund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    // Users.deleteViaApi(user.userId);
  });

  it('C6649 Add allocation to a budget by creating an allocation transaction (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.fundPath);
    console.log(defaultBudget);
    FinanceHelp.searchByName(defaultfund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.increaseAllocation();
    InteractorsTools.checkCalloutMessage(`$50.00 was successfully allocated to the budget ${defaultBudget.name}`);
    Funds.viewTransactions();
    Funds.checkTransactionList(defaultfund.code);
    cy.wait(4000);
    cy.pause();
  });
});
