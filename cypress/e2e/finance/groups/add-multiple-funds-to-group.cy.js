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
import InteractorsTools from '../../../support/utils/interactorsTools';
import Groups from '../../../support/fragments/finance/groups/groups';

describe('ui-finance: Groups', () => {
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
  const defaultGroup = { ...Groups.defaultUiGroup };
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

        Groups.createViaApi(defaultGroup).then((groupResponse) => {
          defaultGroup.id = groupResponse.id;
        });

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
    cy.createTempUser([
      permissions.uiFinanceCreateViewEditGroups.gui,
      permissions.uiFinanceViewEditDeletGroups.gui,
      permissions.uiFinanceViewEditDeletFundBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(firstFund.name);
    Funds.selectFund(firstFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(secondFund.name);
    Funds.selectFund(secondFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    // Need to wait some time fo delating all items
    cy.wait(1000);
    Funds.deleteFundViaApi(firstFund.id);
    Funds.deleteFundViaApi(secondFund.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    Groups.deleteGroupViaApi(defaultGroup.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C347878 Add multiple funds to a group with plugin  (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FinanceHelp.searchByName(defaultGroup.name);
      Groups.selectGroup(defaultGroup.name);
      Groups.addLedgerToGroup(defaultLedger.name);
      InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');
      Groups.checkAddingMultiplyFunds(secondFund.name, firstFund.name);
    },
  );
});
