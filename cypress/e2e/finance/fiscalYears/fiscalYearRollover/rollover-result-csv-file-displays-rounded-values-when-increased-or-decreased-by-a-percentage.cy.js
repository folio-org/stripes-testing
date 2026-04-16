import {
  EXPORT_BUDGET_FIELDS,
  EXPORT_FUND_FIELDS,
  FUND_DISTRIBUTION_TYPES,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  LEDGER_ROLLOVER_ORDER_TYPES,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
} from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  LedgerDetails,
  LedgerRolloverInProgress,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
} from '../../../../support/fragments/orders';
import { NewOrganization } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FundTypes from '../../../../support/fragments/settings/finance/fundTypes';
import {
  DateTools,
  ExecutionFlowManager,
  NumberTools,
} from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';
import getRandomStringCode from '../../../../support/utils/generateTextCode';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const R = {
  BUDGETS: 'budgets',
  FUND_TYPES: 'fundTypes',
  FUNDS: 'funds',
  INITIAL_FISCAL_YEAR: 'initialFiscalYear',
  LEDGER: 'ledger',
  LOCALE: 'locale',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  NEXT_FISCAL_YEAR: 'nextFiscalYear',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  USER_PROPERTIES: 'userProperties',
  VENDOR: 'vendor',
};

const FUND_SCENARIOS = [
  {
    type: getTestEntityValue('Fund type 1'),
    initialAllocation: 111.11,
    adjustAllocation: -1.5,
    rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
    addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
    expected: {
      totalAllocation: 109.44,
      transfers: 0,
      totalFunding: 109.44,
      encumbered: 3.28,
      unavailable: 3.28,
      cashBalance: 109.44,
      available: 106.16,
    },
  },
  {
    type: getTestEntityValue('Fund type 2'),
    initialAllocation: 222.22,
    adjustAllocation: 5,
    rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.AVAILABLE,
    addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.TRANSFER,
    expected: {
      totalAllocation: 233.33,
      transfers: 218.89,
      totalFunding: 452.22,
      encumbered: 3.28,
      unavailable: 3.28,
      cashBalance: 452.22,
      available: 448.94,
    },
  },
  {
    type: getTestEntityValue('Fund type 3'),
    initialAllocation: 333.33,
    adjustAllocation: 1.7,
    rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.CASH_BALANCE,
    addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.TRANSFER,
    expected: {
      totalAllocation: 339,
      transfers: 333.33,
      totalFunding: 672.33,
      encumbered: 3.28,
      unavailable: 3.28,
      cashBalance: 672.33,
      available: 669.05,
    },
  },
];

const deleteDownloadedFile = (fileName) => {
  FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${fileName}`);
};

const toNormalizedMoney = (value, locale) => {
  return NumberTools
    .formatCurrency(Number(value), locale)
    .replaceAll(/[^0-9.-]/g, '');
};

const getColumnValue = (row, key) => {
  return row[key] ?? row[`"${key}"`] ?? '';
};

const checkDownloadedRoundedCsv = ({ fileName, locale }) => {
  FileManager
    .readFile(`${Cypress.config('downloadsFolder')}/${fileName}`)
    .then((fileContent) => {
      const lines = fileContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      expect(lines.length).to.be.greaterThan(1);

      const header = Ledgers.parseCsvLine(lines[0]).map((column) => Ledgers.clean(column));
      const rows = lines.slice(1).map((line) => {
        const cells = Ledgers.parseCsvLine(line).map((cell) => Ledgers.clean(cell));
        return header.reduce((acc, column, index) => ({ ...acc, [column]: cells[index] }), {});
      });

      FUND_SCENARIOS.forEach((scenario) => {
        const row = rows.find((item) => getColumnValue(item, EXPORT_FUND_FIELDS.FUND_TYPE) === scenario.type);
        expect(Boolean(row), `CSV row for fund type "${scenario.type}"`).to.equal(true);

        const checks = [
          [EXPORT_FUND_FIELDS.FUND_TYPE, scenario.type],
          [EXPORT_BUDGET_FIELDS.INITIAL_ALLOCATION, scenario.expected.totalAllocation],
          [EXPORT_BUDGET_FIELDS.TOTAL_ALLOCATED, scenario.expected.totalAllocation],
          [EXPORT_BUDGET_FIELDS.TRANSFERS, scenario.expected.transfers],
          [EXPORT_BUDGET_FIELDS.TOTAL_FUNDING, scenario.expected.totalFunding],
          [EXPORT_BUDGET_FIELDS.BUDGET_ENCUMBERED, scenario.expected.encumbered],
          [EXPORT_BUDGET_FIELDS.UNAVAILABLE, scenario.expected.unavailable],
          [EXPORT_BUDGET_FIELDS.CASH_BALANCE, scenario.expected.cashBalance],
          [EXPORT_BUDGET_FIELDS.AVAILABLE, scenario.expected.available],
        ];

        checks.forEach(([column, expectedValue]) => {
          const actualValue = getColumnValue(row, column).replaceAll(',', '');
          expect(toNormalizedMoney(actualValue, locale), `${scenario.type}: ${column}`).to.equal(
            toNormalizedMoney(expectedValue, locale),
          );
        });
      });
    });
};

describe('Finance | Fiscal Year Rollover', () => {
  const flow = new ExecutionFlowManager();

  before('Create data for rounded rollover result CSV', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createActiveConsecutiveFiscalYears)
      .step(steps.createActiveLedgerForInitialFiscalYear)
      .step(steps.createFundTypes)
      .step(steps.createFundsByType)
      .step(steps.createBudgetsForFunds)
      .step(steps.createVendorForOrder)
      .step(steps.createOpenOrderWithThreeFundDistributions)
      .step(steps.performTestAndCommonRollovers)
      .step(steps.createTestUser)
      .step(steps.loginToLedgerPane);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C831977 Rollover result.csv file displays rounded values when increased or decreased by a percentage (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C831977'] },
    () => {
      const { ledger, locale } = flow.ctx();
      const resultFileName = `${DateTools.getCurrentDateForFileNaming()}-result.csv`;
      const resultsColumnValue = `${DateTools.getCurrentDate()}-result`;

      FinanceHelper.searchByName(ledger.name);
      FinanceHelper.clickLedgerRecordLink(ledger.name);
      LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();
      LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
      LedgerDetails.verifyLedgerName(ledger.name);

      Ledgers.rolloverLogs();
      LedgerRollovers.checkTableContent({
        records: [
          {
            status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
            results: resultsColumnValue,
            source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.COMMIT],
          },
          {
            status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
            results: resultsColumnValue,
            source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
          },
        ],
      });

      LedgerRollovers.exportRolloverResult({ row: 1 });
      checkDownloadedRoundedCsv({ fileName: resultFileName, locale });
      deleteDownloadedFile(resultFileName);

      LedgerRollovers.exportRolloverResult({ row: 0 });
      checkDownloadedRoundedCsv({ fileName: resultFileName, locale });
      deleteDownloadedFile(resultFileName);
    },
  );
});

/* --- Precondition Steps --- */
function getPreconditionSteps() {
  const createActiveConsecutiveFiscalYears = (flow) => {
    const defaultRolloverFiscalYear = FiscalYears.defaultRolloverFiscalYear;
    const series = getRandomStringCode(4);

    return cy.wrap([R.INITIAL_FISCAL_YEAR, R.NEXT_FISCAL_YEAR]).each((key, index) => {
      const periods = DateTools.getFullFiscalYearStartAndEnd(index);

      return FiscalYears
        .createViaApi({
          ...defaultRolloverFiscalYear,
          ...periods,
          series,
          code: `${series}${new Date(periods.periodStart).getFullYear()}`,
        })
        .then((fiscalYear) => flow.set(key, fiscalYear));
    });
  };

  const createActiveLedgerForInitialFiscalYear = (flow) => {
    return Ledgers
      .createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: flow.get(R.INITIAL_FISCAL_YEAR).id,
      })
      .then((ledger) => flow.set(R.LEDGER, ledger));
  };

  const createFundTypes = (flow) => {
    FUND_SCENARIOS.forEach(({ type }) => {
      FundTypes
        .createFundTypesViaApi({ name: type })
        .then((fundType) => {
          const types = flow.get(R.FUND_TYPES) || [];
          flow.set(R.FUND_TYPES, [...types, fundType]);
        });
    });
  };

  const createFundsByType = (flow) => {
    FUND_SCENARIOS.forEach(({ type }) => {
      const { name, ...baseFund } = Funds.getDefaultFund();

      Funds
        .createViaApi({
          ...baseFund,
          name: `[${type}]_${name}`,
          fundTypeId: flow.get(R.FUND_TYPES).find((item) => item.name === type).id,
          ledgerId: flow.get(R.LEDGER).id,
        })
        .then((fundData) => {
          const funds = flow.get(R.FUNDS) || [];
          flow.set(R.FUNDS, [...funds, fundData]);
        });
    });
  };

  const createBudgetsForFunds = (flow) => {
    const funds = flow.get(R.FUNDS);

    funds.forEach(({ fund }) => {
      const type = flow.get(R.FUND_TYPES).find((item) => item.id === fund.fundTypeId).name;
      const scenario = FUND_SCENARIOS.find(({ type: scenarioType }) => scenarioType === type);

      Budgets
        .createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: flow.get(R.INITIAL_FISCAL_YEAR).id,
          fundId: fund.id,
          allocated: scenario.initialAllocation,
        })
        .then((budgetData) => {
          const budgets = flow.get(R.BUDGETS) || [];
          flow.set(R.BUDGETS, [...budgets, budgetData]);
        });
    });
  };

  const createVendorForOrder = (flow) => {
    NewOrganization
      .createViaApi(NewOrganization.getDefaultOrganization())
      .then((organization) => flow.set(R.VENDOR, organization));
  };

  const createOpenOrderWithThreeFundDistributions = (flow) => {
    return Orders
      .createOrderViaApi({
        ...NewOrder.defaultOneTimeOrder,
        reEncumber: true,
        vendor: flow.get(R.VENDOR).id,
      }) // Create order
      .then((order) => flow.set(R.ORDER, order))
      .then(() => cy.getLocations({ limit: 1 }).then((location) => flow.set(R.LOCATION, location))) // Get location
      .then(() => cy.getDefaultMaterialType().then((materialType) => flow.set(R.MATERIAL_TYPE, materialType))) // Get material type
      .then(() => cy.getAcquisitionMethodsApi({ limit: 1 })) // Get acquisition method
      .then(({ body: { acquisitionMethods } }) => { // Create order line with 3 fund distributions
        const funds = flow.get(R.FUNDS);

        return OrderLines.createOrderLineViaApi(BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId: flow.get(R.ORDER).id,
          acquisitionMethod: acquisitionMethods[0].id,
          listUnitPrice: 9.99,
          poLineEstimatedPrice: 9.99,
          quantity: 1,
          fundDistribution: FUND_SCENARIOS.map((_scenario, index) => ({
            fundId: funds[index].fund.id,
            code: funds[index].fund.code,
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            value: 3.33,
          })),
          specialLocationId: flow.get(R.LOCATION).id,
          specialMaterialTypeId: flow.get(R.MATERIAL_TYPE).id,
        }));
      })
      .then((orderLine) => flow.set(R.ORDER_LINE, orderLine))
      .then(() => { // Open order
        const updatedOrder = { ...flow.get(R.ORDER), workflowStatus: ORDER_STATUSES.OPEN }

        Orders
          .updateOrderViaApi(updatedOrder)
          .then(() => flow.set(R.ORDER, updatedOrder));
      });
  };

  const performTestAndCommonRollovers = (flow) => {
    const types = flow.get(R.FUND_TYPES);
    const typesMap = types.reduce((acc, type) => ({ ...acc, [type.name]: type }), {});

    [
      LEDGER_ROLLOVER_TYPES.PREVIEW,
      LEDGER_ROLLOVER_TYPES.COMMIT,
    ].forEach((type) => {
      return LedgerRollovers
        .createLedgerRolloverViaApi({
          ...LedgerRollovers.generateLedgerRollover({
            ledger: flow.get(R.LEDGER),
            fromFiscalYear: flow.get(R.INITIAL_FISCAL_YEAR),
            toFiscalYear: flow.get(R.NEXT_FISCAL_YEAR),
            needCloseBudgets: true,
            budgetsRollover: FUND_SCENARIOS.map((scenario) => ({
              fundTypeId: typesMap[scenario.type].id,
              rolloverAllocation: true,
              adjustAllocation: scenario.adjustAllocation,
              rolloverBudgetValue: scenario.rolloverBudgetValue,
              addAvailableTo: scenario.addAvailableTo,
              setAllowances: false,
            })),
            encumbrancesRollover: [
              {
                orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
                basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
                increaseBy: -1.5,
              },
            ],
          }),
          rolloverType: type,
        })
        .then((rollover) => flow.set(type, rollover));
    });
  };

  const createTestUser = (flow) => {
    return cy
      .createTempUser([
        permissions.uiFinanceViewFiscalYear.gui,
        permissions.uiFinanceViewLedger.gui,
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiFinanceExecuteFiscalYearRollover.gui,
      ])
      .then((userProperties) => flow.set(
        R.USER_PROPERTIES,
        userProperties,
        () => Users.deleteViaApi(userProperties.userId),
      ));
  };

  const loginToLedgerPane = (flow) => {
    const userProperties = flow.get(R.USER_PROPERTIES);

    cy.login(userProperties.username, userProperties.password, {
      path: TopMenu.ledgerPath,
      waiter: Ledgers.waitLoading,
    });
  };

  return {
    createActiveConsecutiveFiscalYears,
    createActiveLedgerForInitialFiscalYear,
    createBudgetsForFunds,
    createFundTypes,
    createFundsByType,
    createOpenOrderWithThreeFundDistributions,
    createVendorForOrder,
    performTestAndCommonRollovers,
    createTestUser,
    loginToLedgerPane,
  };
}
