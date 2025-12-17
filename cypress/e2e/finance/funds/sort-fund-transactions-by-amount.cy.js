import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Funds', () => {
    const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const defaultBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 1000,
    };
    let user;

    before(() => {
      cy.getAdminToken();

      FiscalYears.createViaApi(fiscalYear).then((fiscalYearResponse) => {
        fiscalYear.id = fiscalYearResponse.id;
        defaultBudget.fiscalYearId = fiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = fiscalYear.id;

        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
            defaultBudget.fundId = fundResponse.fund.id;

            Budgets.createViaApi(defaultBudget).then((budgetResponse) => {
              defaultBudget.id = budgetResponse.id;
            });
          });
        });
      });

      cy.createTempUser([
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiFinanceCreateAllocations.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });

        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.selectBudgetDetails();

        Funds.increaseAllocation('1');
        Funds.increaseAllocation('5');
        Funds.decreaseAllocation('10');
        Funds.increaseAllocation('500');
        Funds.decreaseAllocation('1000');

        cy.visit(TopMenu.fundPath);
        Funds.waitLoading();
        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
      });
    });

    after(() => {
      cy.getAdminToken();
      Budgets.deleteViaApi(defaultBudget.id);
      Funds.deleteFundViaApi(defaultFund.id);
      Ledgers.deleteLedgerViaApi(defaultLedger.id);
      FiscalYears.deleteFiscalYearViaApi(fiscalYear.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C688789 User can sort fund transactions by amount (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C688789'] },
      () => {
        Funds.waitForFundDetailsLoading();

        Funds.viewTransactionsForCurrentBudget();
        Funds.waitLoadingTransactions();
        Funds.verifyTransactionsTableDisplayed();

        Funds.clickTransactionAmountColumn();

        Funds.verifyTransactionsSortedByAmount(true);

        Funds.clickTransactionAmountColumn();

        Funds.verifyTransactionsSortedByAmount(false);
      },
    );
  });
});
