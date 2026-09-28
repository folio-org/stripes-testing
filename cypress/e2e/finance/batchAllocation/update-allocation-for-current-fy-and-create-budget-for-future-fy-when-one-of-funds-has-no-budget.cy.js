import { FUNDING_INFORMATION_NAMES, NO_VALUE } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  LedgerDetails,
  Ledgers,
} from '../../../support/fragments/finance';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import { CodeTools, DateTools, StringTools } from '../../../support/utils';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import States from '../../../support/fragments/finance/states';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Batch allocation', () => {
    const fiscalYearSeries = `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}`;

    const testData = {
      fiscalYears: {
        current: {},
        future: {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `${fiscalYearSeries}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledger: {},
      fundA: {},
      budgetA: {},
      fundB: {},
      fundC: {},
      budgetC: {},
      user: {},
    };

    const createBudgetWithFundLedgerAndFiscalYear = () => {
      const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: {
          code: `${fiscalYearSeries}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        fund: { name: `autotest_fund_A_${getRandomPostfix()}` },
        budget: { allocated: 100 },
      });

      testData.fiscalYears.current = fiscalYear;
      testData.ledger = ledger;
      testData.fundA = fund;
      testData.budgetA = budget;
    };

    const createFutureFiscalYear = () => {
      return FiscalYears.createViaApi(testData.fiscalYears.future).then((fiscalYear) => {
        testData.fiscalYears.future = fiscalYear;
      });
    };

    const createFundBWithoutBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `autotest_fund_B_${getRandomPostfix()}`,
        ledgerId: testData.ledger.id,
      }).then((fundResponse) => {
        testData.fundB = fundResponse.fund;
      });
    };

    const createFundCWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `autotest_fund_C_${getRandomPostfix()}`,
        ledgerId: testData.ledger.id,
      }).then((fundResponse) => {
        testData.fundC = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.current.id,
          fundId: testData.fundC.id,
          allocated: 100,
        }).then((budget) => {
          testData.budgetC = budget;
        });
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceCreateAllocations.gui,
          Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
          Permissions.uiFinanceViewLedger.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ledgerPath,
            waiter: Ledgers.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(createBudgetWithFundLedgerAndFiscalYear)
        .then(createFutureFiscalYear)
        .then(createFundBWithoutBudget)
        .then(createFundCWithBudget)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C1045388 Update allocation for the current fiscal year and create a budget for the future fiscal year when one of the Funds has no budget (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C1045388', 'nonParallel'] },
      () => {
        const { current: currentFiscalYear, future: futureFiscalYear } = testData.fiscalYears;
        const { fundA, fundB, fundC, budgetA, budgetC } = testData;

        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Step 1: Open batch allocation for the current fiscal year
        BatchEditBudget.clickBatchAllocationButton();
        BatchEditBudget.searchFiscalYearInBatchAllocation(currentFiscalYear);
        BatchEditBudget.selectFiscalYearInBatchAllocation(currentFiscalYear);
        BatchEditBudget.saveAndCloseBatchAllocation();
        BatchEditBudget.verifyBatchEditBudget([
          {
            fundName: fundA.name,
            fundStatus: fundA.fundStatus,
            budgetName: budgetA.name,
            allocatedBefore: '$100.00',
          },
          { fundName: fundB.name, fundStatus: fundB.fundStatus, budgetName: NO_VALUE },
          {
            fundName: fundC.name,
            fundStatus: fundC.fundStatus,
            budgetName: budgetC.name,
            allocatedBefore: '$100.00',
          },
        ]);

        // Step 2: Increase the allocation of Fund A
        BatchEditBudget.setAllocationChange(fundA.name, 10);
        BatchEditBudget.clickRecalculateButton();
        BatchEditBudget.clickSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(States.allocationsUpdatedSuccessfully);
        LedgerDetails.checkLedgerDetails({
          financialSummary: {
            information: [{ key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: '$210.00' }],
          },
          funds: [
            { name: fundA.name, allocated: '$110.00' },
            { name: fundC.name, allocated: '$100.00' },
          ],
        });

        // Step 3: Open batch allocation for the future fiscal year
        BatchEditBudget.clickBatchAllocationButton();
        BatchEditBudget.searchFiscalYearInBatchAllocation(futureFiscalYear);
        BatchEditBudget.selectFiscalYearInBatchAllocation(futureFiscalYear);
        BatchEditBudget.saveAndCloseBatchAllocation();
        BatchEditBudget.verifyBatchEditBudget([
          { fundName: fundA.name, fundStatus: fundA.fundStatus, budgetName: NO_VALUE },
          { fundName: fundB.name, fundStatus: fundB.fundStatus, budgetName: NO_VALUE },
          { fundName: fundC.name, fundStatus: fundC.fundStatus, budgetName: NO_VALUE },
        ]);

        // Step 4: Create a planned budget for Fund C
        BatchEditBudget.setAllocationChange(fundC.name, 20);
        BatchEditBudget.clickRecalculateButton();
        BatchEditBudget.clickSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(States.allocationsUpdatedSuccessfully);
        InteractorsTools.checkCalloutMessage(States.budgetsCreatedSuccessfully);
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Step 5: Check the budgets of the funds
        LedgerDetails.openFundDetails(fundA.name);
        FundDetails.checkCurrentBudget({ name: budgetA.name, allocated: '$110.00' });
        FundDetails.checkPlannedBudgets([]);
        FundDetails.closeFundDetails();

        Funds.searchByName(fundB.name);
        Funds.selectFund(fundB.name);
        FundDetails.checkCurrentBudget();
        FundDetails.checkPlannedBudgets([]);

        Funds.searchByName(fundC.name);
        Funds.selectFund(fundC.name);
        FundDetails.checkCurrentBudget({ name: budgetC.name, allocated: '$100.00' });
        FundDetails.checkPlannedBudgets([
          { name: `${fundC.code}-${futureFiscalYear.code}`, allocated: '$20.00' },
        ]);

        // Step 6: Open batch allocation for the current fiscal year
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.verifyLedgerName(testData.ledger.name);
        BatchEditBudget.clickBatchAllocationButton();
        BatchEditBudget.searchFiscalYearInBatchAllocation(currentFiscalYear);
        BatchEditBudget.selectFiscalYearInBatchAllocation(currentFiscalYear);
        BatchEditBudget.saveAndCloseBatchAllocation();
        BatchEditBudget.verifyBatchEditBudget([
          {
            fundName: fundA.name,
            fundStatus: fundA.fundStatus,
            budgetName: budgetA.name,
            allocatedBefore: '$110.00',
          },
          { fundName: fundB.name, fundStatus: fundB.fundStatus, budgetName: NO_VALUE },
          {
            fundName: fundC.name,
            fundStatus: fundC.fundStatus,
            budgetName: budgetC.name,
            allocatedBefore: '$100.00',
          },
        ]);

        // Step 7: Increase the allocations of Fund A and Fund C
        BatchEditBudget.setAllocationChange(fundA.name, 10);
        BatchEditBudget.setAllocationChange(fundC.name, 10);
        BatchEditBudget.clickRecalculateButton();
        BatchEditBudget.clickSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(States.allocationsUpdatedSuccessfully);
        LedgerDetails.checkLedgerDetails({
          financialSummary: {
            information: [{ key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: '$230.00' }],
          },
          funds: [
            { name: fundA.name, allocated: '$120.00' },
            { name: fundC.name, allocated: '$110.00' },
          ],
        });

        // Step 8: Open batch allocation for the future fiscal year
        BatchEditBudget.clickBatchAllocationButton();
        BatchEditBudget.searchFiscalYearInBatchAllocation(futureFiscalYear);
        BatchEditBudget.selectFiscalYearInBatchAllocation(futureFiscalYear);
        BatchEditBudget.saveAndCloseBatchAllocation();
        BatchEditBudget.verifyBatchEditBudget([
          { fundName: fundA.name, fundStatus: fundA.fundStatus, budgetName: NO_VALUE },
          { fundName: fundB.name, fundStatus: fundB.fundStatus, budgetName: NO_VALUE },
          {
            fundName: fundC.name,
            fundStatus: fundC.fundStatus,
            budgetName: `${fundC.code}-${futureFiscalYear.code}`,
            allocatedBefore: '$20.00',
          },
        ]);

        // Step 9: Create a planned budget for Fund B and increase the allocation of Fund C
        BatchEditBudget.setAllocationChange(fundB.name, 30);
        BatchEditBudget.setAllocationChange(fundC.name, 10);
        BatchEditBudget.clickRecalculateButton();
        BatchEditBudget.clickSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(States.allocationsUpdatedSuccessfully);
        InteractorsTools.checkCalloutMessage(States.budgetsCreatedSuccessfully);
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Step 10: Check the budgets of the funds
        LedgerDetails.openFundDetails(fundA.name);
        FundDetails.checkCurrentBudget({ name: budgetA.name, allocated: '$120.00' });
        FundDetails.checkPlannedBudgets([]);

        Funds.searchByName(fundB.name);
        Funds.selectFund(fundB.name);
        FundDetails.checkCurrentBudget();
        FundDetails.checkPlannedBudgets([
          { name: `${fundB.code}-${futureFiscalYear.code}`, allocated: '$30.00' },
        ]);

        Funds.searchByName(fundC.name);
        Funds.selectFund(fundC.name);
        FundDetails.checkCurrentBudget({ name: budgetC.name, allocated: '$110.00' });
        FundDetails.checkPlannedBudgets([
          { name: `${fundC.code}-${futureFiscalYear.code}`, allocated: '$30.00' },
        ]);

        // Step 11: Open batch allocation for the current fiscal year
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.verifyLedgerName(testData.ledger.name);
        BatchEditBudget.clickBatchAllocationButton();
        BatchEditBudget.searchFiscalYearInBatchAllocation(currentFiscalYear);
        BatchEditBudget.selectFiscalYearInBatchAllocation(currentFiscalYear);
        BatchEditBudget.saveAndCloseBatchAllocation();
        BatchEditBudget.verifyBatchEditBudget([
          {
            fundName: fundA.name,
            fundStatus: fundA.fundStatus,
            budgetName: budgetA.name,
            allocatedBefore: '$120.00',
          },
          { fundName: fundB.name, fundStatus: fundB.fundStatus, budgetName: NO_VALUE },
          {
            fundName: fundC.name,
            fundStatus: fundC.fundStatus,
            budgetName: budgetC.name,
            allocatedBefore: '$110.00',
          },
        ]);

        // Step 12: Increase the allocation of Fund A and create a current budget for Fund B
        BatchEditBudget.setAllocationChange(fundA.name, 10);
        BatchEditBudget.setAllocationChange(fundB.name, 40);
        BatchEditBudget.clickRecalculateButton();
        BatchEditBudget.clickSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(States.allocationsUpdatedSuccessfully);
        InteractorsTools.checkCalloutMessage(States.budgetsCreatedSuccessfully);
        LedgerDetails.checkLedgerDetails({
          financialSummary: {
            information: [{ key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: '$280.00' }],
          },
          funds: [
            { name: fundA.name, allocated: '$130.00' },
            { name: fundB.name, allocated: '$40.00' },
            { name: fundC.name, allocated: '$110.00' },
          ],
        });

        // Step 13: Open batch allocation for the future fiscal year
        BatchEditBudget.clickBatchAllocationButton();
        BatchEditBudget.searchFiscalYearInBatchAllocation(futureFiscalYear);
        BatchEditBudget.selectFiscalYearInBatchAllocation(futureFiscalYear);
        BatchEditBudget.saveAndCloseBatchAllocation();
        BatchEditBudget.verifyBatchEditBudget([
          { fundName: fundA.name, fundStatus: fundA.fundStatus, budgetName: NO_VALUE },
          {
            fundName: fundB.name,
            fundStatus: fundB.fundStatus,
            budgetName: `${fundB.code}-${futureFiscalYear.code}`,
            allocatedBefore: '$30.00',
          },
          {
            fundName: fundC.name,
            fundStatus: fundC.fundStatus,
            budgetName: `${fundC.code}-${futureFiscalYear.code}`,
            allocatedBefore: '$30.00',
          },
        ]);

        // Step 14: Increase the planned allocations of Fund B and Fund C
        BatchEditBudget.setAllocationChange(fundB.name, 10);
        BatchEditBudget.setAllocationChange(fundC.name, 10);
        BatchEditBudget.clickRecalculateButton();
        BatchEditBudget.clickSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(States.allocationsUpdatedSuccessfully);
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Step 15: Check the budgets of the funds
        LedgerDetails.openFundDetails(fundA.name);
        FundDetails.checkCurrentBudget({ name: budgetA.name, allocated: '$130.00' });
        FundDetails.checkPlannedBudgets([]);

        Funds.searchByName(fundB.name);
        Funds.selectFund(fundB.name);
        FundDetails.checkCurrentBudget({
          name: `${fundB.code}-${currentFiscalYear.code}`,
          allocated: '$40.00',
        });
        FundDetails.checkPlannedBudgets([
          { name: `${fundB.code}-${futureFiscalYear.code}`, allocated: '$40.00' },
        ]);

        Funds.searchByName(fundC.name);
        Funds.selectFund(fundC.name);
        FundDetails.checkCurrentBudget({ name: budgetC.name, allocated: '$110.00' });
        FundDetails.checkPlannedBudgets([
          { name: `${fundC.code}-${futureFiscalYear.code}`, allocated: '$40.00' },
        ]);
      },
    );
  });
});
