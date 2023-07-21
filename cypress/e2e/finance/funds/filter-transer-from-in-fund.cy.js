import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';

describe('ui-finance: Transactions', () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
    allocatedToIds: [{
      0: firstFund.id,
    }],
  };

  const allocatedQuantity = '1000';
  let user;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear)
      .then(firstFiscalYearResponse => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;
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
                Funds.selectFund(firstFund.name);
                Funds.addBudget(allocatedQuantity);
              });

            Funds.createViaApi(secondFund)
              .then(secondFundResponse => {
                secondFund.id = secondFundResponse.fund.id;
              });
          });
      });

    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.ledgerPath, waiter: Ledgers.waitForLedgerDetailsLoading });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C380708 Filter in "Transfer from" and "Transfer to" fields works correctly when creating a new fund (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    FinanceHelp.searchByName(defaultfund.name);
    Funds.selectFund(defaultfund.name);
    Funds.selectBudgetDetails();
    Funds.increaseAllocation();
    InteractorsTools.checkCalloutMessage(`$50.00 was successfully allocated to the budget ${defaultfund.code}-${defaultFiscalYear.code}`);
    Funds.viewTransactions();
    Funds.checkTransactionList(defaultfund.code);
  });
});
