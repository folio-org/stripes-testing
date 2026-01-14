import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';

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
      fundStatus: 'Inactive',
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_C_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_3`,
      fundStatus: 'Inactive',
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_D_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_4`,
      fundStatus: 'Inactive',
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_E_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_5`,
      fundStatus: 'Inactive',
    },
  ];

  const budgets = [
    { ...Budgets.getDefaultBudget(), allocated: 100 },
    { ...Budgets.getDefaultBudget(), allocated: 200 },
    { ...Budgets.getDefaultBudget(), allocated: 300 },
    { ...Budgets.getDefaultBudget(), allocated: 400 },
    { ...Budgets.getDefaultBudget(), allocated: 500, budgetStatus: 'Inactive' },
  ];

  before('Setup data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledger.fiscalYearOneId = fy.id;
      budgets.forEach((b) => {
        b.fiscalYearId = fy.id;
      });
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        funds.forEach((fund, idx) => {
          fund.ledgerId = ledger.id;
          Funds.createViaApi(fund).then((fundResp) => {
            fund.id = fundResp.fund.id;
            const budgetToUse = budgets[idx];
            budgetToUse.fundId = fund.id;
            Budgets.createViaApi(budgetToUse).then((budgetResp) => {
              budgetToUse.id = budgetResp.id;
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
    'C651420 Recalculate and save batch allocations (with status change for Funds or Budgets) on the "Batch edit funds" screen accessed from Ledger (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C651420'] },
    () => {
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.saveAndCloseBatchAllocation();
      BatchEditBudget.setFundStatus(funds[0].name, 'Inactive');
      BatchEditBudget.setBudgetStatus(funds[0].name, 'Inactive');
      BatchEditBudget.setAllocationChange(funds[1].name, '50');
      BatchEditBudget.setAllocationChange(funds[2].name, '-50');
      BatchEditBudget.setAllowableEncumbrance(funds[3].name, '75');
      BatchEditBudget.setBudgetStatus(funds[4].name, 'Active');
      BatchEditBudget.setAllocationChange(funds[4].name, '100');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(4000);
      BatchEditBudget.assertTotalAllocatedAfter(funds[1].name, '250.00');
      BatchEditBudget.assertTotalAllocatedAfter(funds[2].name, '250.00');
      BatchEditBudget.assertTotalAllocatedAfter(funds[4].name, '600.00');
      BatchEditBudget.clickSaveAndCloseButton();
      LedgerDetails.checkLedgerDetails({
        funds: [
          {
            name: funds[0].name,
            allocated: '100.00',
          },
          {
            name: funds[1].name,
            allocated: '250.00',
          },
          {
            name: funds[2].name,
            allocated: '250.00',
          },
          {
            name: funds[3].name,
            allocated: '400.00',
          },
          {
            name: funds[4].name,
            allocated: '600.00',
          },
        ],
      });
      LedgerDetails.openFundDetails(funds[0].name);
      Funds.checkFundStatus('Inactive');
      Funds.selectBudgetDetails();
      Funds.checkBudgetStatus('Inactive');
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[1].name);
      Funds.checkFundStatus('Active');
      FundDetails.checkFundDetails({
        currentBudget: { name: budgets[1].name, allocated: '$250.00' },
      });
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$200.00' },
          { key: 'Increase in allocation', value: '$50.00' },
          { key: 'Decrease in allocation', value: '$0.00' },
          { key: 'Total allocated', value: '$250.00' },
        ],
      });
      Funds.checkBudgetStatus('Active');
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[2].name);
      Funds.checkFundStatus('Inactive');
      FundDetails.checkFundDetails({
        currentBudget: { name: budgets[2].name, allocated: '$250.00' },
      });
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$300.00' },
          { key: 'Increase in allocation', value: '$0.00' },
          { key: 'Decrease in allocation', value: '$50.00' },
          { key: 'Total allocated', value: '$250.00' },
          { key: 'Net transfers', value: '$0.00' },
          { key: 'Total funding', value: '$250.00' },
        ],
      });
      Funds.checkBudgetStatus('Active');
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[3].name);
      Funds.checkFundStatus('Inactive');
      FundDetails.checkFundDetails({
        currentBudget: { name: budgets[3].name, allocated: '$400.00' },
      });
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$400.00' },
          { key: 'Total funding', value: '$400.00' },
        ],
      });
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: 'Name', value: budgets[3].name },
          { key: 'Status', value: 'Active' },
          { key: 'Allowable expenditure', value: '100%' },
          { key: 'Allowable encumbrance', value: '75%' },
        ],
      });
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[4].name);
      Funds.checkFundStatus('Active');
      FundDetails.checkFundDetails({
        currentBudget: { name: budgets[4].name, allocated: '$600.00' },
      });
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$500.00' },
          { key: 'Increase in allocation', value: '$100.00' },
          { key: 'Total funding', value: '$600.00' },
        ],
      });
      Funds.checkBudgetStatus('Active');
    },
  );
});
