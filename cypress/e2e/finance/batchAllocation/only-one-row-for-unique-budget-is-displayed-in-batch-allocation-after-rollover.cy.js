import {
  LEDGER_ROLLOVER_BUDGET_VALUE,
  LEDGER_VIEW_FIELDS,
  ROLLOVER_BUDGET_VALUE_AS,
} from '../../../support/constants';
import { GROUP_VIEW_FIELDS } from '../../../support/constants/finance/group';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  GroupDetails,
  Groups,
  LedgerDetails,
  LedgerRollovers,
  Ledgers,
} from '../../../support/fragments/finance';
import { CodeTools, DateTools, NumberTools, StringTools } from '../../../support/utils';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';
import InteractorsTools from '../../../support/utils/interactorsTools';
import FileManager from '../../../support/utils/fileManager';
import States from '../../../support/fragments/finance/states';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const CURRENT_BUDGET_ALLOCATION = 100;
const PLANNED_BUDGET_ALLOCATION = 200;
// Rollover adds the current budget allocation to the planned budget of the next fiscal year
const ROLLED_OVER_ALLOCATION = CURRENT_BUDGET_ALLOCATION + PLANNED_BUDGET_ALLOCATION;

describe('Finance', () => {
  describe('Batch allocation', () => {
    const fiscalYearSeries = `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}`;

    const testData = {
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `${fiscalYearSeries}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `${fiscalYearSeries}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledger: {},
      group: {},
      fund: {},
      currentBudget: {},
      plannedBudget: {},
      user: {},
      locale: 'en-US',
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first').then(() => createFiscalYear('second'));
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledger) => {
        testData.ledger = ledger;
      });
    };

    const createGroup = () => {
      return Groups.createViaApi(Groups.getDefaultGroup()).then((group) => {
        testData.group = group;
      });
    };

    const createBudget = (budgetKey, fiscalYear, allocated) => {
      return Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        fiscalYearId: fiscalYear.id,
        fundId: testData.fund.id,
        allocated,
      }).then((budget) => {
        testData[budgetKey] = budget;
      });
    };

    const createFundInGroupWithCurrentAndPlannedBudgets = () => {
      return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: testData.ledger.id }, [
        testData.group.id,
      ])
        .then(({ fund }) => {
          testData.fund = fund;

          return createBudget(
            'currentBudget',
            testData.fiscalYears.first,
            CURRENT_BUDGET_ALLOCATION,
          );
        })
        .then(() => {
          return createBudget(
            'plannedBudget',
            testData.fiscalYears.second,
            PLANNED_BUDGET_ALLOCATION,
          );
        });
    };

    const rolloverLedgerToSecondFiscalYear = () => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
              addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.TRANSFER,
            },
          ],
          encumbrancesRollover: [],
        }),
      );
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewEditFiscalYear.gui,
          Permissions.uiFinanceViewLedger.gui,
          Permissions.uiFinanceViewGroups.gui,
          Permissions.uiFinanceCreateAllocations.gui,
          Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.groupsPath,
            waiter: Groups.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });

      createConsecutiveFiscalYears()
        .then(createLedger)
        .then(createGroup)
        .then(createFundInGroupWithCurrentAndPlannedBudgets)
        .then(rolloverLedgerToSecondFiscalYear)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      FileManager.deleteFile(
        `cypress/downloads/${testData.fiscalYears.second.code}${testData.ledger.code}.csv`,
      );
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C656288 Only one row for unique budget is displayed in batch allocation form and allocation worksheet after rollover (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C656288', 'nonParallel'] },
      () => {
        const format = (value) => NumberTools.formatCurrency(value, testData.locale);
        const { first: firstFiscalYear, second: secondFiscalYear } = testData.fiscalYears;
        const worksheetFileName = `${secondFiscalYear.code}${testData.ledger.code}.csv`;

        // Step 1: Open the group details
        Groups.searchByName(testData.group.name);
        Groups.selectGroupByName(testData.group.name);
        GroupDetails.checkGroupDetails({
          information: [{ key: GROUP_VIEW_FIELDS.FISCAL_YEAR, value: firstFiscalYear.code }],
          funds: [{ name: testData.fund.name, allocated: format(CURRENT_BUDGET_ALLOCATION) }],
        });

        // Step 2: Only the current fiscal year is in the "Fiscal year" dropdown
        GroupDetails.checkFiscalYearDropdownOptions({
          current: [firstFiscalYear.code],
          previous: [],
        });

        // Step 3: Change fiscal years dates so that the second fiscal year becomes current
        FinanceHelper.selectFiscalYearsNavigation();

        const currentYear = new Date().getFullYear();

        [
          { fiscalYear: firstFiscalYear, year: currentYear - 1 },
          { fiscalYear: secondFiscalYear, year: currentYear },
        ].forEach(({ fiscalYear, year }) => {
          FinanceHelper.searchByName(fiscalYear.name);
          FiscalYears.selectFY(fiscalYear.name);
          FiscalYears.editFiscalYearDetails();
          FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
            `01/01/${year}`,
            `12/31/${year}`,
          );
        });

        // Step 4: Open the ledger details
        FinanceHelper.selectLedgersNavigation();
        FinanceHelper.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.checkLedgerDetails({
          information: [{ key: LEDGER_VIEW_FIELDS.FISCAL_YEAR, value: secondFiscalYear.code }],
          funds: [{ name: testData.fund.name, allocated: format(ROLLED_OVER_ALLOCATION) }],
        });
        LedgerDetails.checkGroupsDetails([
          { name: testData.group.name, allocated: format(ROLLED_OVER_ALLOCATION) },
        ]);

        // Step 5: Download allocation worksheet for the current fiscal year
        BatchEditBudget.clickDownloadAllocationWorksheet();
        BatchEditBudget.selectFiscalYearInConfirmModal(secondFiscalYear);
        BatchEditBudget.clickConfirmButton();
        InteractorsTools.checkCalloutMessage(States.exportAllocationStartedSuccessfully);

        // Step 6: The worksheet contains one row for the planned budget of Fund A
        Ledgers.checkColumnNamesInDownloadedLedgerAllocationWorksheet(worksheetFileName);
        Ledgers.checkLedgerExportRowsCount(worksheetFileName, 1);
        Ledgers.checkLedgerExportRow(
          worksheetFileName,
          { fundName: testData.fund.name },
          {
            fiscalYear: secondFiscalYear.code,
            fundName: testData.fund.name,
            fundCode: testData.fund.code,
            fundUUID: testData.fund.id,
            fundStatus: testData.fund.fundStatus,
            budgetName: testData.plannedBudget.name,
            budgetUUID: testData.plannedBudget.id,
            budgetStatus: testData.plannedBudget.budgetStatus,
            budgetInitialAllocation: String(PLANNED_BUDGET_ALLOCATION),
            budgetCurrentAllocation: String(ROLLED_OVER_ALLOCATION),
            budgetAllowableEncumbrance: String(testData.plannedBudget.allowableEncumbrance),
            budgetAllowableExpenditure: String(testData.plannedBudget.allowableExpenditure),
            allocationAdjustment: '0',
            transactionTag: '',
            transactionDescription: '',
          },
        );

        // Step 7: Batch allocation form contains one row for Fund A
        BatchEditBudget.clickBatchAllocationButton();
        BatchEditBudget.searchFiscalYearInBatchAllocation(secondFiscalYear);
        BatchEditBudget.selectFiscalYearInBatchAllocation(secondFiscalYear);
        BatchEditBudget.saveAndCloseBatchAllocation();
        BatchEditBudget.verifyBatchEditBudget([
          {
            fundName: testData.fund.name,
            fundStatus: testData.fund.fundStatus,
            budgetName: testData.plannedBudget.name,
            allocatedBefore: format(ROLLED_OVER_ALLOCATION),
          },
        ]);
      },
    );
  });
});
