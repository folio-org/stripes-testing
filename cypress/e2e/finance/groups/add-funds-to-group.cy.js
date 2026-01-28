import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Groups,
  Ledgers,
} from '../../../support/fragments/finance';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
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
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
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

  before('Create test data and login', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((response) => {
      fiscalYear.id = response.id;
      ledger.fiscalYearOneId = fiscalYear.id;
      firstBudget.fiscalYearId = fiscalYear.id;
      secondBudget.fiscalYearId = fiscalYear.id;
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        firstFund.ledgerId = ledger.id;
        secondFund.ledgerId = ledger.id;

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
      Permissions.uiFinanceViewEditDeleteFundBudget.gui,
      Permissions.uiFinanceViewGroups.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.selectFundsNavigation();
      Funds.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Budgets.getBudgetViaApi({ query: `fundId="${firstFund.id}"` }).then((budgetsResponse) => {
      budgetsResponse.budgets.forEach((budget) => {
        Budgets.deleteViaApi(budget.id);
      });
    });
    Budgets.getBudgetViaApi({ query: `fundId="${secondFund.id}"` }).then((budgetsResponse) => {
      budgetsResponse.budgets.forEach((budget) => {
        Budgets.deleteViaApi(budget.id);
      });
    });
    Funds.deleteFundViaApi(firstFund.id);
    Funds.deleteFundViaApi(secondFund.id);
    cy.wait(2000);
    Groups.deleteGroupViaApi(firstGroup.id);
    cy.wait(2000);
    Groups.deleteGroupViaApi(secondGroup.id);
    Ledgers.deleteLedgerViaApi(ledger.id);
    cy.wait(2000);
    FiscalYears.deleteFiscalYearViaApi(fiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C4056 Add funds to a group (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C4056'] },
    () => {
      FinanceHelper.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.addGroupToFund(firstGroup.name);
      InteractorsTools.checkCalloutMessage('Fund has been saved');
      Funds.checkAddGroupToFund(firstGroup.name);
      Funds.addGroupToFund(secondGroup.name);
      InteractorsTools.checkCalloutMessage('Fund has been saved');
      Funds.checkAddGroupToFund(`${firstGroup.name}, ${secondGroup.name}`);

      FinanceHelper.selectGroupsNavigation();
      FinanceHelper.searchByName(firstGroup.name);
      Groups.selectGroup(firstGroup.name);
      Groups.addFundToGroup(secondFund.name);
      InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');
      Groups.checkAddingMultiplyFunds(secondFund.name, firstFund.name);
      FinanceHelper.searchByName(secondGroup.name);
      Groups.selectGroup(secondGroup.name);
      Groups.addFundToGroup(firstFund.name);
      InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');
    },
  );
});
