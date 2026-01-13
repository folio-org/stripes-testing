// TO DO: Now we do not have the ability to delete data, becouse deleting transactions is now impossible.
// In the future they want to change this.
// For this reason I have already written a method for cleaning the data and I think it should be kept.
import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Transactions', () => {
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 50,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 50,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);
          });
        });
      });
    });
    cy.createTempUser([permissions.uiFinanceCreateTransfers.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, { path: TopMenu.fundPath, waiter: Funds.waitLoading });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6650 Add transfer to a budget by creating a transfer transaction (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C6650'] },
    () => {
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.transfer(firstFund, secondFund);
      InteractorsTools.checkCalloutMessage(
        `$10.00 was successfully transferred to the budget ${firstBudget.name}`,
      );
      Funds.viewTransactions();
      Funds.selectTransactionInList('Transfer');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$10.00',
        'User',
        'Transfer',
        `${firstFund.name} (${firstFund.code})`,
      );
    },
  );
});
