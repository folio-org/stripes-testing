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

describe('ui-finance: Add transfer to budget', () => {
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const allocatedQuantity = '50';
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
            firstFund.ledgerId = defaultLedger.id;
            secondFund.ledgerId = defaultLedger.id;

            Funds.createViaApi(firstFund)
              .then(fundResponse => {
                firstFund.id = fundResponse.fund.id;

                cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
                FinanceHelp.searchByName(firstFund.name);
                FinanceHelp.selectFromResultsList();
                Funds.addBudget(allocatedQuantity);
              });
            Funds.createViaApi(secondFund)
              .then(fundResponse => {
                secondFund.id = fundResponse.fund.id;

                cy.visit(TopMenu.fundPath);
                FinanceHelp.searchByName(secondFund.name);
                FinanceHelp.selectFromResultsList();
                Funds.addBudget(allocatedQuantity);
              });
          });
      });
    cy.createTempUser([
      permissions.uiFinanceCreateTransfers.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.fundPath, waiter: Funds.waitLoading });
      });
  });

  after(() => {
    cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(firstFund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(secondFund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    InteractorsTools.checkCalloutMessage('Budget has been deleted');
    Funds.checkIsBudgetDeleted();

    Funds.deleteFundViaApi(defaultfund.id);

    Ledgers.deleteledgerViaApi(defaultLedger.id);

    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);

    Users.deleteViaApi(user.userId);
  });

  it('C6650 Add transfer to a budget by creating a transfer transaction (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    console.log(defaultFiscalYear);
    FinanceHelp.searchByName(firstFund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.transfer(firstFund.name, secondFund.name);
    InteractorsTools.checkCalloutMessage(`$50.00 was successfully allocated to the budget ${firstFund.code}-${defaultFiscalYear.code}`);
    Funds.viewTransactions();
    Funds.checkTransactionList(firstFund.code);
  });
});
