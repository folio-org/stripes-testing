import {
  FISCAL_YEARS_VIEW_FIELDS,
  FUNDING_INFORMATION_NAMES,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  LEDGER_ROLLOVER_ORDER_TYPES,
  ROLLOVER_BUDGET_VALUE_AS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
} from '../../../support/constants';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYearDetails,
  FiscalYears,
  FundDetails,
  Funds,
  GroupDetails,
  Groups,
  LedgerDetails,
  LedgerRollovers,
  Ledgers,
} from '../../../support/fragments/finance';
import { CodeTools, DateTools, NumberTools, StringTools } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Funds', () => {
    const code = CodeTools(4);
    const allocatedAmount = 1000;

    const testData = {
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_A${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_B${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledger: {},
      group: {},
      fund: {},
      budget: {},
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

    const createFundWithBudget = () => {
      return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: testData.ledger.id }, [
        testData.group.id,
      ]).then((fundResponse) => {
        testData.fund = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: testData.fund.id,
          allocated: allocatedAmount,
        }).then((budget) => {
          testData.budget = budget;
        });
      });
    };

    const rolloverToSecondFiscalYear = () => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          needCloseBudgets: false,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.AVAILABLE,
              addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.TRANSFER,
            },
          ],
          encumbrancesRollover: [
            {
              orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
              basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
            },
          ],
        }),
      );
    };

    const updateFiscalYearDates = (fiscalYearKey, offset) => {
      const updatedFY = {
        ...testData.fiscalYears[fiscalYearKey],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      };

      return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
        testData.fiscalYears[fiscalYearKey] = { ...updatedFY, _version: updatedFY._version + 1 };
      });
    };

    const shiftFiscalYearDates = () => {
      return updateFiscalYearDates('first', -1).then(() => updateFiscalYearDates('second', 0));
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceRecalculateBudgetTotals.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewGroups.gui,
          Permissions.uiFinanceViewLedger.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
          FinanceHelper.searchByName(testData.fund.name);
          Funds.selectFund(testData.fund.name);
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
        .then(createFundWithBudget)
        .then(rolloverToSecondFiscalYear)
        .then(shiftFiscalYearDates)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C627392 Budget summary for Net Transfers includes Rollover transfer amounts after budget total recalculation (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C627392'] },
      () => {
        const format = (value) => NumberTools.formatCurrency(value, testData.locale);
        const fundingInformation = [
          { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(allocatedAmount) },
          { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(allocatedAmount) },
          { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(allocatedAmount * 2) },
        ];

        // Step 1: Open current budget details
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({ summary: fundingInformation });

        // Step 2: Recalculate budget totals
        BudgetDetails.clickRecalculateBudgetTotals();
        BudgetDetails.checkBudgetDetails({ summary: fundingInformation });

        // Step 3: Check the second fiscal year details
        BudgetDetails.closeBudgetDetails();
        FinanceHelper.selectFiscalYearsNavigation();
        FinanceHelper.searchByName(testData.fiscalYears.second.name);
        FiscalYears.selectFiscalYear(testData.fiscalYears.second.name);
        FiscalYearDetails.checkFiscalYearDetails({
          information: [
            { key: FISCAL_YEARS_VIEW_FIELDS.NAME, value: testData.fiscalYears.second.name },
          ],
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(allocatedAmount) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(allocatedAmount) },
              { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(allocatedAmount * 2) },
            ],
            balance: { cash: format(allocatedAmount * 2), available: format(allocatedAmount * 2) },
          },
          ledgers: [
            {
              name: testData.ledger.name,
              allocated: format(allocatedAmount),
              unavailable: format(0),
              available: format(allocatedAmount * 2),
            },
          ],
          groups: [
            {
              name: testData.group.name,
              allocated: format(allocatedAmount),
              unavailable: format(0),
              available: format(allocatedAmount * 2),
            },
          ],
          funds: [
            {
              name: testData.fund.name,
              allocated: format(allocatedAmount),
              unavailable: format(0),
              available: format(allocatedAmount * 2),
            },
          ],
        });

        // Step 4: Check net transfers of the ledger
        FiscalYearDetails.openLedgerDetails(testData.ledger.name);
        LedgerDetails.checkLedgerDetails({
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(allocatedAmount) },
            ],
          },
        });

        // Step 5: Check net transfers of the group
        FinanceHelper.selectGroupsNavigation();
        FinanceHelper.searchByName(testData.group.name);
        Groups.selectGroup(testData.group.name);
        Groups.waitLoading();
        GroupDetails.checkGroupDetails({
          financialSummary: {
            information: [
              { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(allocatedAmount) },
            ],
          },
        });
      },
    );
  });
});
