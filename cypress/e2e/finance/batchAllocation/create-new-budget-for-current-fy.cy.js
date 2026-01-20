import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import InteractorsTools from '../../../support/utils/interactorsTools';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';

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
  ];

  before('Create test data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledger.fiscalYearOneId = fy.id;
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        funds.forEach((fund) => {
          fund.ledgerId = ledger.id;
          Funds.createViaApi(fund).then((fundResp) => {
            fund.id = fundResp.fund.id;
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
    'C651440 Create new budget for current FY on batch allocation screen, accessed from Ledger (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C651440'] },
    () => {
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      BatchEditBudget.clickBatchAllocationButton();
      BatchEditBudget.saveAndCloseBatchAllocation();
      BatchEditBudget.increaseAllocationForFund(funds[0].name, '-50');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(1000);
      BatchEditBudget.checkErrorMessageForNegativeAllocation();
      BatchEditBudget.increaseAllocationForFund(funds[0].name, '100');
      BatchEditBudget.setAllowableExpenditure(funds[0].name, '80');
      BatchEditBudget.increaseAllocationForFund(funds[1].name, '150');
      BatchEditBudget.clickRecalculateButton();
      cy.wait(1000);
      BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '100.00');
      BatchEditBudget.assertTotalAllocatedAfter(funds[1].name, '150.00');
      BatchEditBudget.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage('Allocations have been updated successfully.');
      LedgerDetails.openFundDetails(funds[0].name);
      Funds.checkFundStatus('Active');
      FundDetails.checkFundDetails({
        currentBudget: [{ name: `${funds[0].code}-${fiscalYear.code}`, allocated: '$100.00' }],
      });
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Total funding', value: '$100.00' }],
      });
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: 'Name', value: `${funds[0].code}-${fiscalYear.code}` },
          { key: 'Status', value: 'Active' },
          { key: 'Allowable expenditure', value: '80%' },
        ],
      });
      Funds.closeBudgetDetails();
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      LedgerDetails.openFundDetails(funds[1].name);
      Funds.checkFundStatus('Active');
      FundDetails.checkFundDetails({
        currentBudget: [{ name: `${funds[1].code}-${fiscalYear.code}`, allocated: '$150.00' }],
      });
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Total funding', value: '$150.00' }],
      });
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: 'Name', value: `${funds[1].code}-${fiscalYear.code}` },
          { key: 'Status', value: 'Active' },
        ],
      });
    },
  );
});
