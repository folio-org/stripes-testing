import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Groups from '../../../support/fragments/finance/groups/groups';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const funds = [
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_A_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_1`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_B_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_2`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_C_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_3`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_D_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_4`,
    },
  ];

  const groupA = { ...Groups.defaultUiGroup };
  const groupB = {
    ...Groups.defaultUiGroup,
    name: `autotest_group_2_${getRandomPostfix()}`,
    code: `${getRandomPostfix()}_2`,
  };

  const budgets = [
    { ...Budgets.getDefaultBudget(), allocated: 100 },
    { ...Budgets.getDefaultBudget(), allocated: 200 },
    { ...Budgets.getDefaultBudget(), allocated: 300 },
    { ...Budgets.getDefaultBudget(), allocated: 400 },
  ];
  before('Setup data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledger.fiscalYearOneId = fy.id;
      budgets[0].fiscalYearId = fy.id;
      budgets[1].fiscalYearId = fy.id;
      budgets[2].fiscalYearId = fy.id;
      budgets[3].fiscalYearId = fy.id;
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        funds[0].ledgerId = ledger.id;
        funds[1].ledgerId = ledger.id;
        funds[2].ledgerId = ledger.id;
        funds[3].ledgerId = ledger.id;
        Groups.createViaApi(groupA).then((groupAResponse) => {
          groupA.id = groupAResponse.id;
          Groups.createViaApi(groupB).then((groupBResponse) => {
            groupB.id = groupBResponse.id;
            Funds.createViaApi(funds[0], [groupA.id, groupB.id]).then((fundResponseA) => {
              funds[0].id = fundResponseA.fund.id;
              budgets[0].fundId = fundResponseA.fund.id;
              Budgets.createViaApi(budgets[0]);
            });
            Funds.createViaApi(funds[1]).then((fundResponseB) => {
              funds[1].id = fundResponseB.fund.id;
              budgets[1].fundId = fundResponseB.fund.id;
              Budgets.createViaApi(budgets[1]);
            });
            Funds.createViaApi(funds[2]).then((fundResponseC) => {
              funds[2].id = fundResponseC.fund.id;
              budgets[2].fundId = fundResponseC.fund.id;
              Budgets.createViaApi(budgets[2]);
            });
            Funds.createViaApi(funds[3]).then((fundResponseD) => {
              funds[3].id = fundResponseD.fund.id;
              budgets[3].fundId = fundResponseD.fund.id;
              Budgets.createViaApi(budgets[3]);
            });
          });
        });
      });
    });
    cy.createTempUser([
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewGroups.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C648530 Recalculate and save batch allocation on "Batch edit funds" window, accessed from Ledger (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C648530'] },
    () => {
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.saveAndCloseBatchAllocation();
      BatchEditBudget.setAllocationChange(funds[0].name, '-150');
      BatchEditBudget.clickRecalculateButton();
      BatchEditBudget.checkErrorMessageForNegativeAllocation();
      BatchEditBudget.setAllocationChange(funds[0].name, '-50');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(4000);
      BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '50.00');
      BatchEditBudget.cancelBatchEditBudget();
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.saveAndCloseBatchAllocation();
      BatchEditBudget.setAllocationChange(funds[0].name, '50');
      BatchEditBudget.addTransactionTags(funds[0].name, ['important']);
      BatchEditBudget.setAllocationChange(funds[1].name, '-50');
      BatchEditBudget.setAllowableExpenditure(funds[2].name, '50');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(4000);
      BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '150.00');
      BatchEditBudget.assertTotalAllocatedAfter(funds[1].name, '150.00');
      BatchEditBudget.clickSaveAndCloseButton();
      LedgerDetails.checkLedgerDetails({
        funds: [
          {
            name: funds[0].name,
            allocated: '150.00',
          },
          {
            name: funds[1].name,
            allocated: '150.00',
          },
        ],
      });
      LedgerDetails.openFundDetails(funds[0].name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.checkPaymentInTransactionDetails(0, fiscalYear.code, 'User', funds[0].name, '$50.00');
      Funds.assertHasTagWithInteractors('important');
      Funds.closePaneHeader();
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[0].name);
      Funds.viewTransactionsForCurrentBudget();
      Funds.checkPaymentInTransactionDetails(0, fiscalYear.code, 'User', funds[1].name, '($50.00)');
    },
  );
});
