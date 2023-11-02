// TO DO: Now we do not have the ability to delete data, becouse deleting transactions is now impossible.
// In the future they want to change this.
// For this reason I have already written a method for cleaning the data and I think it should be kept.
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('ui-finance: Transactions', () => {
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
  const allocatedQuantity = '50';
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantity);
        });

        Funds.createViaApi(secondFund).then((secondFundResponse) => {
          secondFund.id = secondFundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(secondFund.name);
          Funds.selectFund(secondFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    cy.createTempUser([permissions.uiFinanceCreateTransfers.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, { path: TopMenu.fundPath, waiter: Funds.waitLoading });
    });
  });

  after(() => {
    // cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
    // FinanceHelp.searchByName(firstFund.name);
    // FinanceHelp.selectFromResultsList();
    // Funds.selectBudgetDetails();
    // Funds.deleteBudgetViaActions();
    // cy.visit(TopMenu.fundPath);
    // FinanceHelp.searchByName(secondFund.name);
    // FinanceHelp.selectFromResultsList();
    // Funds.selectBudgetDetails();
    // Funds.deleteBudgetViaActions();
    // InteractorsTools.checkCalloutMessage('Budget has been deleted');
    // Funds.checkIsBudgetDeleted();
    // Funds.deleteFundViaApi(firstFund.id);
    // Funds.deleteFundViaApi(secondFund.id);
    // Ledgers.deleteledgerViaApi(defaultLedger.id);
    // FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6650 Add transfer to a budget by creating a transfer transaction (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.transfer(firstFund, secondFund);
      InteractorsTools.checkCalloutMessage(
        `$10.00 was successfully transferred to the budget ${firstFund.code}-${defaultFiscalYear.code}`,
      );
      Funds.viewTransactions();
      Funds.checkTransactionList(firstFund.code);
    },
  );
});
