import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const pastFiscalYear = {
    ...FiscalYears.defaultUiFiscalYear,
    name: `${FiscalYears.defaultUiFiscalYear.name}_Past`,
    periodStart: `${DateTools.getThreePreviousDaysDateForFiscalYear()}T00:00:00.000+12:00`,
    periodEnd: `${DateTools.getPreviousDayDateForFiscalYear()}T00:00:00.000+12:00`,
  };
  const ledger = { ...Ledgers.defaultUiLedger };
  const funds = [
    { ...Funds.defaultUiFund, name: 'Fund A', code: `${getRandomPostfix()}_1` },
    { ...Funds.defaultUiFund, name: 'Fund B', code: `${getRandomPostfix()}_2` },
    {
      ...Funds.defaultUiFund,
      name: 'Fund C',
      fundStatus: 'Inactive',
      code: `${getRandomPostfix()}_3`,
    },
    { ...Funds.defaultUiFund, name: 'Fund D', code: `${getRandomPostfix()}_4` },
  ];

  const budgets = [
    { ...Budgets.getDefaultBudget(), allocated: 100 },
    {},
    { ...Budgets.getDefaultBudget(), allocated: 100 },
    { ...Budgets.getDefaultBudget(), allocated: 100 },
  ];

  before('Setup data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledger.fiscalYearOneId = fy.id;
      pastFiscalYear.code = fiscalYear.code.slice(0, -1) + '2';
      budgets[0].fiscalYearId = fy.id;
      budgets[2].fiscalYearId = fy.id;
      budgets[3].fiscalYearId = fy.id;
      FiscalYears.createViaApi(pastFiscalYear).then((pastFy) => {
        pastFiscalYear.id = pastFy.id;
        Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          ledger.id = ledgerResponse.id;
          funds[0].ledgerId = ledger.id;
          funds[1].ledgerId = ledger.id;
          funds[2].ledgerId = ledger.id;
          funds[3].ledgerId = ledger.id;

          Funds.createViaApi(funds[0]).then((fundResponseA) => {
            funds[0].id = fundResponseA.fund.id;
            budgets[0].fundId = fundResponseA.fund.id;
            Budgets.createViaApi(budgets[0]);
          });

          Funds.createViaApi(funds[1]).then((fundResponseB) => {
            funds[1].id = fundResponseB.fund.id;
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

    // Create user
    cy.createTempUser([
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
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
    'C648486 User can access "Batch edit budgets" screen from Ledger, edit and cancel changes (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C648486'] },
    () => {
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.cancelBatchAllocation();
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.searchFiscalYearInBatchAllocation(pastFiscalYear);
      BatchEditBudget.expectEmptySelectionList();
      BatchEditBudget.cancelBatchAllocation();
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.searchFiscalYearInBatchAllocation(fiscalYear);
      BatchEditBudget.selectFiscalYearInBatchAllocation(fiscalYear);
      BatchEditBudget.saveAndCloseBatchAllocation();
      BatchEditBudget.verifyBatchEditBudget([
        {
          fundName: funds[0].name,
          fundStatus: funds[0].fundStatus,
          budgetName: budgets[0].name,
          allocatedBefore: `$${budgets[0].allocated}.00`,
        },
        {
          fundName: funds[1].name,
          fundStatus: funds[1].fundStatus,
          budgetName: 'No value set-',
          allocatedBefore: 'No value set-',
        },
        {
          fundName: funds[2].name,
          fundStatus: funds[2].fundStatus,
          budgetName: budgets[2].name,
          allocatedBefore: `$${budgets[2].allocated}.00`,
        },
        {
          fundName: funds[3].name,
          fundStatus: funds[3].fundStatus,
          budgetName: budgets[3].name,
          allocatedBefore: `$${budgets[3].allocated}.00`,
        },
      ]);
      BatchEditBudget.verifySortingByColumn('Fund name', 0);
      BatchEditBudget.verifySortingByColumn('Budget Name', 2);
      BatchEditBudget.increaseAllocationForFund(funds[0].name, 50);
      BatchEditBudget.assertSortingAvailability('Fund name', false);
      BatchEditBudget.assertSortingAvailability('Budget Name', false);
      BatchEditBudget.increaseAllocationForFund(funds[0].name, 0);
      BatchEditBudget.assertSortingAvailability('Fund name', 0, true);
      BatchEditBudget.assertSortingAvailability('Budget Name', 2, true);
      BatchEditBudget.setFundStatus(funds[1].name, 'Inactive');
      BatchEditBudget.setBudgetStatus(funds[2].name, 'Closed');
      BatchEditBudget.setAllocationChange(funds[0].name, 100);
      BatchEditBudget.setAllowableEncumbrance(funds[3].name, 50);
      BatchEditBudget.setAllowableExpenditure(funds[2].name, 50);
      BatchEditBudget.addTransactionTags(funds[1].name, ['important']);
      BatchEditBudget.cancelBatchEditBudget();
      BatchEditBudget.closeWithoutSavingBatchEditBudget();
    },
  );
});
