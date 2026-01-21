import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Groups from '../../../support/fragments/finance/groups/groups';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

Cypress.on('uncaught:exception', () => false);

describe('Groups', () => {
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
  const firstGroup = { ...Groups.defaultUiGroup };
  const secondGroup = {
    name: `autotest_group_2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    status: 'Active',
  };
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
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      firstBudget.fiscalYearId = defaultFiscalYear.id;
      secondBudget.fiscalYearId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Groups.createViaApi(firstGroup).then((firstGroupResponse) => {
          firstGroup.id = firstGroupResponse.id;
        });
        Groups.createViaApi(secondGroup).then((secondGroupResponse) => {
          secondGroup.id = secondGroupResponse.id;
        });

        Funds.createViaApi(firstFund).then((firstFundResponse) => {
          firstFund.id = firstFundResponse.fund.id;
          firstBudget.fundId = firstFundResponse.fund.id;
          Budgets.createViaApi(firstBudget);
        });
        Funds.createViaApi(secondFund).then((secondFundResponse) => {
          secondFund.id = secondFundResponse.fund.id;
          secondBudget.fundId = secondFundResponse.fund.id;
          Budgets.createViaApi(secondBudget);
        });
      });
    });
    cy.createTempUser([
      permissions.uiFinanceViewEditDeleteFundBudget.gui,
      permissions.uiFinanceViewGroups.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
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
    Groups.deleteGroupViaApi(firstGroup.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    Groups.deleteGroupViaApi(secondGroup.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C4056 Add funds to a group (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C4056'] },
    () => {
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.addGroupToFund(firstGroup.name);
      InteractorsTools.checkCalloutMessage('Fund has been saved');
      Funds.checkAddGroupToFund(firstGroup.name);
      Funds.addGroupToFund(secondGroup.name);
      InteractorsTools.checkCalloutMessage('Fund has been saved');
      Funds.checkAddGroupToFund(`${firstGroup.name}, ${secondGroup.name}`);
      cy.visit(TopMenu.groupsPath);
      FinanceHelp.searchByName(firstGroup.name);
      Groups.selectGroup(firstGroup.name);
      Groups.addFundToGroup(secondFund.name);
      InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');
      Groups.checkAddingMultiplyFunds(secondFund.name, firstFund.name);
      FinanceHelp.searchByName(secondGroup.name);
      Groups.selectGroup(secondGroup.name);
      Groups.addFundToGroup(firstFund.name);
      InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');
    },
  );
});
