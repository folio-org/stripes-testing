import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Groups from '../../../support/fragments/finance/groups/groups';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';

describe('Finance › Funds', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledgerA = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };
  const ledgerB = {
    ...Ledgers.defaultUiLedger,
    name: `autotest_ledger_2_${getRandomPostfix()}`,
    code: `test_automation_code_2_${getRandomPostfix()}`,
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };
  const fundA = { ...Funds.defaultUiFund };
  const fundB = {
    ...Funds.defaultUiFund,
    allocatedToIds: [],
    name: `autotest_fund_2_${getRandomPostfix()}`,
    code: `1${getRandomPostfix()}_2`,
  };
  const budgetA = { ...Budgets.getDefaultBudget(), allocated: 100 };
  const budgetB = { ...Budgets.getDefaultBudget(), allocated: 0 };
  const groupA = { ...Groups.defaultUiGroup };
  const groupB = {
    ...Groups.defaultUiGroup,
    name: `autotest_group_2_${getRandomPostfix()}`,
    code: `${getRandomPostfix()}_2`,
  };

  before('Setup data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledgerA.fiscalYearOneId = fy.id;
      ledgerB.fiscalYearOneId = fy.id;
      budgetA.fiscalYearId = fy.id;
      budgetB.fiscalYearId = fy.id;

      Ledgers.createViaApi(ledgerA).then((ledgerAResponse) => {
        ledgerA.id = ledgerAResponse.id;
        fundA.ledgerId = ledgerAResponse.id;
        Ledgers.createViaApi(ledgerB).then((ledgerBResponse) => {
          ledgerB.id = ledgerBResponse.id;
          fundB.ledgerId = ledgerBResponse.id;

          Groups.createViaApi(groupA).then((groupAResponse) => {
            groupA.id = groupAResponse.id;
            Groups.createViaApi(groupB).then((groupBResponse) => {
              groupB.id = groupBResponse.id;

              Funds.createViaApi(fundA, [groupA.id]).then((fundAResponse) => {
                fundA.id = fundAResponse.fund.id;
                budgetA.fundId = fundAResponse.fund.id;
                fundB.allocatedToIds.push(fundAResponse.fund.id);
                Budgets.createViaApi(budgetA);
              });
              Funds.createViaApi(fundB, [groupB.id]).then((fundBResponse) => {
                fundB.id = fundBResponse.fund.id;
                budgetB.fundId = fundBResponse.fund.id;
                Budgets.createViaApi(budgetB);
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceCreateTransfers.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewGroups.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C535516 Money transfer between funds from different ledgers is successful if budget "From" already has 0.00 money allocation (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Funds.searchByName(fundB.name);
      Funds.selectFund(fundB.name);
      Funds.selectBudgetDetails();
      Funds.checkBudgetQuantity1(`$${budgetB.allocated}`, '$0.00');
      Funds.transfer(fundA, fundB);
      Funds.checkNegativeAvailableAmountModal(budgetB.name);
      Funds.clickConfirmInNegativeAvailableAmountModal();
      InteractorsTools.checkCalloutMessage(
        `$10.00 was successfully transferred to the budget ${budgetA.name}`,
      );
      Funds.checkBudgetQuantity1('($10.00)', '($10.00)');
      Funds.viewTransactions();
      Funds.selectTransactionInList('Transfer');
      Funds.varifyDetailsInTransaction(
        fiscalYear.code,
        '($10.00)',
        'User',
        'Transfer',
        `${fundB.name} (${fundB.code})`,
      );
      Funds.closeTransactionDetails();
      Funds.closePaneHeader();
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledgerB.name);
      Ledgers.selectLedger(ledgerB.name);
      Ledgers.checkFinancialSummeryQuality('($10.00)', '($10.00)');
      FinanceHelper.selectGroupsNavigation();
      Groups.searchByName(groupB.name);
      Groups.selectGroup(groupB.name);
      Groups.checkFinancialSummary({
        balance: {
          cash: '($10.00)',
          available: '($10.00)',
        },
      });
    },
  );
});
