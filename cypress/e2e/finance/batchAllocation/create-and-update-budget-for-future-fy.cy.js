import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import InteractorsTools from '../../../support/utils/interactorsTools';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import Budgets from '../../../support/fragments/finance/budgets/budgets';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear1 = { ...FiscalYears.defaultUiFiscalYear };
  const fiscalYear2 = {
    ...FiscalYears.defaultUiFiscalYear,
    name: `${FiscalYears.defaultUiFiscalYear.name}_Next`,
    periodStart: `${DateTools.get5DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+12:00`,
    periodEnd: `${DateTools.get7DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+12:00`,
  };
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
      fundStatus: 'Inactive',
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_C_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_3`,
    },
  ];

  const budgets = [
    { ...Budgets.getDefaultBudget() },
    { ...Budgets.getDefaultBudget() },
    { ...Budgets.getDefaultBudget() },
  ];

  before('Setup data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear1).then((fy1) => {
      fiscalYear1.id = fy1.id;
      ledger.fiscalYearOneId = fy1.id;
      budgets.forEach((b) => {
        b.fiscalYearId = fy1.id;
      });
      fiscalYear2.code = fiscalYear1.code.slice(0, -1) + '2';
      FiscalYears.createViaApi(fiscalYear2).then((fy2) => {
        fiscalYear2.id = fy2.id;
        Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          ledger.id = ledgerResponse.id;
          funds.forEach((fund, index) => {
            fund.ledgerId = ledger.id;
            Funds.createViaApi(fund).then((fundResp) => {
              fund.id = fundResp.fund.id;
              const budgetToUse = budgets[index];
              budgetToUse.fundId = fund.id;
              Budgets.createViaApi(budgetToUse).then((budgetResp) => {
                budgetToUse.id = budgetResp.id;
              });
            });
          });
        });
      });
    });

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
    'C651433 Create new budget for future FY on batch allocation screen, accessed from Ledger (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C651433'] },
    () => {
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.selectFiscalYearInConfirmModal(fiscalYear2);
      BatchEditBudget.saveAndCloseBatchAllocation();
      BatchEditBudget.increaseAllocationForFund(funds[0].name, '-50');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(1000);
      BatchEditBudget.checkErrorMessageForNegativeAllocation();
      BatchEditBudget.increaseAllocationForFund(funds[0].name, '50');
      BatchEditBudget.setAllowableExpenditure(funds[0].name, '-10');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(1000);
      BatchEditBudget.checkErrorMessageForNegativeEncumbranceOrExpenditure();
      BatchEditBudget.setAllowableExpenditure(funds[0].name, '80');
      BatchEditBudget.increaseAllocationForFund(funds[0].name, '50');
      BatchEditBudget.addTransactionTags(funds[0].name, ['important']);
      BatchEditBudget.increaseAllocationForFund(funds[1].name, '75');
      BatchEditBudget.setAllowableEncumbrance(funds[1].name, '85');
      BatchEditBudget.setBudgetStatus(funds[2].name, 'Planned');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(1000);
      BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '50.00');
      BatchEditBudget.assertTotalAllocatedAfter(funds[1].name, '75.00');
      BatchEditBudget.assertTotalAllocatedAfter(funds[2].name, '');
      BatchEditBudget.increaseAllocationForFund(funds[0].name, '20');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(1000);
      BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '20.00');
      BatchEditBudget.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage('Allocations have been updated successfully.');
      LedgerDetails.openFundDetails(funds[0].name);
      FundDetails.checkFundDetails({
        plannedBudgets: [{ name: `${funds[0].code}-${fiscalYear2.code}`, allocated: '$20.00' }],
      });
      Funds.selectPlannedBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$20.00' },
          { key: 'Total allocated', value: '$20.00' },
          { key: 'Total funding', value: '$20.00' },
        ],
      });
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: 'Name', value: `${funds[0].code}-${fiscalYear2.code}` },
          { key: 'Status', value: 'Planned' },
          { key: 'Allowable expenditure', value: '80%' },
        ],
      });
      Funds.viewTransactions();
      Funds.checkPaymentInTransactionDetails(0, fiscalYear2.code, 'User', funds[0].name, '$20.00');
      Funds.assertHasTagWithInteractors('important');
      Funds.closePaneHeader();
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[1].name);
      Funds.checkFundStatus('Active');
      FundDetails.checkFundDetails({
        plannedBudgets: [{ name: `${funds[1].code}-${fiscalYear2.code}`, allocated: '$75.00' }],
      });
      Funds.selectPlannedBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$75.00' },
          { key: 'Total allocated', value: '$75.00' },
          { key: 'Total funding', value: '$75.00' },
        ],
      });
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: 'Name', value: `${funds[1].code}-${fiscalYear2.code}` },
          { key: 'Status', value: 'Planned' },
          { key: 'Allowable encumbrance', value: '85%' },
        ],
      });
      Funds.viewTransactions();
      Funds.checkPaymentInTransactionDetails(0, fiscalYear2.code, 'User', funds[1].name, '$75.00');
      Funds.closePaneHeader();
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[2].name);
      FundDetails.checkFundDetails({
        plannedBudgets: [{ name: `${funds[2].code}-${fiscalYear2.code}`, allocated: '$0.00' }],
      });
      Funds.selectPlannedBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$0.00' },
          { key: 'Total allocated', value: '$0.00' },
          { key: 'Total funding', value: '$0.00' },
        ],
      });
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: 'Name', value: `${funds[2].code}-${fiscalYear2.code}` },
          { key: 'Status', value: 'Planned' },
        ],
      });
    },
  );
});
