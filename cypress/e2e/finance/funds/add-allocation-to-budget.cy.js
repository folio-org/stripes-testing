import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Transactions', () => {
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 50,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          defaultBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(defaultBudget);
        });
      });
    });
    cy.createTempUser([permissions.uiFinanceCreateAllocations.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    InteractorsTools.checkCalloutMessage('Budget has been deleted');
    Funds.checkIsBudgetDeleted();

    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultFund.id);

    Ledgers.deleteLedgerViaApi(defaultLedger.id);

    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C6649 Add allocation to a budget by creating an allocation transaction (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C6649'] },
    () => {
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.increaseAllocation();
      InteractorsTools.checkCalloutMessage(
        `$50.00 was successfully allocated to the budget ${defaultBudget.name}`,
      );
      Funds.viewTransactions();
      Funds.checkTransactionList(defaultFund.code);
    },
  );
});
