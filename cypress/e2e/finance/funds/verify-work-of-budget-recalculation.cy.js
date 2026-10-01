import { FUNDING_INFORMATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  Ledgers,
  Transactions,
  Transfers,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { NumberTools } from '../../../support/utils';

const ALLOCATED_AMOUNT = 1000;
const INCREASE_AMOUNT = 100;
const DECREASE_AMOUNT = 50;
const MOVE_AMOUNT = 30;
const TRANSFER_AMOUNT = 20;

describe('Finance', () => {
  describe('Funds', () => {
    const testData = {
      fiscalYear: FiscalYears.getDefaultFiscalYear(),
      ledger: {},
      fundA: {},
      budgetA: {},
      fundB: {},
      budgetB: {},
      user: {},
      locale: 'en-US',
    };

    const createFiscalYear = () => {
      return FiscalYears.createViaApi(testData.fiscalYear).then((fiscalYear) => {
        testData.fiscalYear = fiscalYear;
      });
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYear.id,
      }).then((ledger) => {
        testData.ledger = ledger;
      });
    };

    const createFundWithBudget = (fundKey, budgetKey) => {
      return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: testData.ledger.id })
        .then(({ fund }) => {
          testData[fundKey] = fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYear.id,
            fundId: fund.id,
            allocated: ALLOCATED_AMOUNT,
          });
        })
        .then((budget) => {
          testData[budgetKey] = budget;
        });
    };

    const createFundsWithBudgets = () => {
      return createFundWithBudget('fundA', 'budgetA').then(() => {
        return createFundWithBudget('fundB', 'budgetB');
      });
    };

    const createAllocationTransactions = () => {
      const fiscalYearId = testData.fiscalYear.id;

      return Transactions.createBatchAllocationsViaApi([
        { amount: INCREASE_AMOUNT, toFundId: testData.fundA.id, fiscalYearId },
        { amount: DECREASE_AMOUNT, fromFundId: testData.fundA.id, fiscalYearId },
        {
          amount: MOVE_AMOUNT,
          fromFundId: testData.fundB.id,
          toFundId: testData.fundA.id,
          fiscalYearId,
        },
      ]);
    };

    const createTransfer = () => {
      return Transfers.createTransferViaApi(
        Transfers.getDefaultTransfer({
          amount: TRANSFER_AMOUNT,
          fromFundId: testData.fundB.id,
          toFundId: testData.fundA.id,
          fiscalYearId: testData.fiscalYear.id,
        }),
      );
    };

    const resetBudgetTotalsInStorage = () => {
      return Budgets.getBudgetFromStorageViaApi(testData.budgetA.id).then((budget) => {
        return Budgets.updateBudgetInStorageViaApi({
          ...budget,
          allocated: 0.0,
          available: 0.0,
          netTransfers: 0.0,
          initialAllocation: 0.0,
          allocationTo: 0.0,
          allocationFrom: 0.0,
        });
      });
    };

    const loginAndOpenBudgetOfFundA = () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
      FinanceHelper.searchByName(testData.fundA.name);
      Funds.selectFund(testData.fundA.name);
      FundDetails.openCurrentBudgetDetails();
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceRecalculateBudgetTotals.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          loginAndOpenBudgetOfFundA();
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });

      createFiscalYear()
        .then(createLedger)
        .then(createFundsWithBudgets)
        .then(createAllocationTransactions)
        .then(createTransfer)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C432321 Postman | Verify work of budget recalculation (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C432321'] },
      () => {
        const format = (value) => NumberTools.formatCurrency(value, testData.locale);
        const increaseAmount = INCREASE_AMOUNT + MOVE_AMOUNT;
        const totalAllocated = ALLOCATED_AMOUNT + increaseAmount - DECREASE_AMOUNT;
        const initialBudgetSummary = [
          { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(ALLOCATED_AMOUNT) },
          { key: FUNDING_INFORMATION_NAMES.INCREASE_IN_ALLOCATION, value: format(increaseAmount) },
          { key: FUNDING_INFORMATION_NAMES.DECREASE_IN_ALLOCATION, value: format(DECREASE_AMOUNT) },
          { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(totalAllocated) },
          { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(TRANSFER_AMOUNT) },
          {
            key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING,
            value: format(totalAllocated + TRANSFER_AMOUNT),
          },
        ];
        const zeroBudgetSummary = Object.values(FUNDING_INFORMATION_NAMES).map((key) => ({
          key,
          value: format(0),
        }));

        // Step 1: Check current budget of the fund
        BudgetDetails.checkBudgetDetails({ summary: initialBudgetSummary });

        // Steps 2-5: Reset budget totals directly in storage as admin
        cy.getAdminToken();
        resetBudgetTotalsInStorage();

        // Step 6: Log in as test user and open the budget again
        loginAndOpenBudgetOfFundA();
        BudgetDetails.checkBudgetDetails({ summary: zeroBudgetSummary });

        // Step 7: Recalculate budget totals
        BudgetDetails.clickRecalculateBudgetTotals();
        BudgetDetails.checkBudgetDetails({ summary: initialBudgetSummary });
      },
    );
  });
});
