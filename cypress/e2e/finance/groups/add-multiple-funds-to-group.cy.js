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
  const defaultGroup = { ...Groups.defaultUiGroup };
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

        Groups.createViaApi(defaultGroup).then((groupResponse) => {
          defaultGroup.id = groupResponse.id;
        });

        Funds.createViaApi(firstFund).then((firstFundResponse) => {
          firstFund.id = firstFundResponse.fund.id;
          firstBudget.fundId = firstFundResponse.fund.id;
          Budgets.createViaApi(firstBudget);
        });
        cy.getAdminToken();
        Funds.createViaApi(secondFund).then((secondFundResponse) => {
          secondFund.id = secondFundResponse.fund.id;
          secondBudget.fundId = secondFundResponse.fund.id;
          Budgets.createViaApi(secondBudget);
        });
      });
    });
    cy.createTempUser([
      permissions.uiFinanceCreateViewEditGroups.gui,
      permissions.uiFinanceViewEditDeleteGroups.gui,
      permissions.uiFinanceViewEditDeleteFundBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Budgets.deleteViaApi(firstBudget.id);
    Budgets.deleteViaApi(secondBudget.id);
    // Need to wait some time fo delating all items
    cy.wait(1000);
    Funds.deleteFundViaApi(firstFund.id);
    Funds.deleteFundViaApi(secondFund.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    Groups.deleteGroupViaApi(defaultGroup.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(1000);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C347878 Add multiple funds to a group with plugin  (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C347878'] },
    () => {
      FinanceHelp.searchByName(defaultGroup.name);
      Groups.selectGroup(defaultGroup.name);
      Groups.addLedgerToGroup(defaultLedger.name);
      InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');
      Groups.checkAddingMultiplyFunds(secondFund.name, firstFund.name);
    },
  );
});
