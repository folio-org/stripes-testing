import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  EXPORT_BUDGET_FIELDS,
  EXPORT_FUND_FIELDS,
  LEDGER_ROLLOVER_BUDGET_VALUE_LABELS,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
  ORDER_STATUSES,
  TRANSACTION_TYPES,
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
  INITIAL_FISCAL_YEAR: 'initialFiscalYear',
  NEXT_FISCAL_YEAR: 'nextFiscalYear',
  LEDGER: 'ledger',
  FUND_TYPES: 'fundTypes',
  FUNDS: 'funds',
  BUDGETS: 'budgets',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  USER_PROPERTIES: 'userProperties',
  LOCALE: 'locale',
};

const FUND_SCENARIOS = [
  {
    type: getTestEntityValue('Fund type 1'),
    initialAllocation: 111.11,
    adjustAllocation: -1.5,
    rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
    addAvailableTo: TRANSACTION_TYPES.ALLOCATION,
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
    rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.AVAILABLE,
    addAvailableTo: TRANSACTION_TYPES.TRANSFER,
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
    rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.CASH_BALANCE,
    addAvailableTo: TRANSACTION_TYPES.TRANSFER,
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
  FileManager.deleteFile(`cypress/downloads/${fileName}`);
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
  FileManager.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
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
      .step(steps.createFundsWithBudgetsByType)
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
    const types = [];

    FUND_SCENARIOS.forEach(({ type }) => {
      FundTypes
        .createFundTypesViaApi({ name: type })
        .then(types.push);
    });

    return flow.set(R.FUND_TYPES, types);
  };

  const createFundsWithBudgetsByType = (flow) => {
    const funds = [];
    const budgets = [];

    return cy.wrap(FUND_SCENARIOS).each((scenario, index) => {
      const { name, ...baseFund } = Funds.getDefaultFund();

      return Funds
        .createViaApi({
          ...baseFund,
          name: `[${scenario.type}]_${name}`,
          ledgerId: flow.get(R.LEDGER).id,
          fundTypeId: flow.get(R.FUND_TYPES).find((type) => type.name === scenario.type).id,
        })
        .then(funds.push)
        .then(() => Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fundId: funds[index].id,
          fiscalYearId: flow.get(R.INITIAL_FISCAL_YEAR).id,
          allocated: scenario.initialAllocation,
        }))
        .then(budgets.push);
    })
      .then(() => {
        flow.set(R.FUNDS, funds);
        flow.set(R.BUDGETS, budgets);
      });
  };

  const createOpenOrderWithThreeFundDistributions = (flow) => {
    return Orders
      .createOrderViaApi({ ...NewOrder.getDefaultOrder(), reEncumber: true })
      .then((order) => flow.set(R.ORDER, order))
      .then(() => {
        const orderLineContext = {};

        return cy.getLocations({ limit: 1 })
          .then((location) => {
            orderLineContext.location = location;
            return cy.getDefaultMaterialType();
          })
          .then((materialType) => {
            orderLineContext.materialType = materialType;
            return cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            });
          })
          .then((methodsResponse) => {
            const funds = flow.get(R.FUNDS);
            const fundDistribution = FUND_SCENARIOS.map((scenario) => ({
              fundId: funds[scenario.type].id,
              code: funds[scenario.type].code,
              distributionType: 'amount',
              value: 3.33,
            }));

            return OrderLines.createOrderLineViaApi(
              BasicOrderLine.getDefaultOrderLine({
                purchaseOrderId: order.id,
                acquisitionMethod: methodsResponse.body.acquisitionMethods[0].id,
                listUnitPrice: 9.99,
                poLineEstimatedPrice: 9.99,
                quantity: 1,
                fundDistribution,
                specialLocationId: orderLineContext.location.id,
                specialMaterialTypeId: orderLineContext.materialType.id,
              }),
            );
          })
          .then((orderLine) => {
            register(
              flow,
              R.ORDER_LINE,
              orderLine,
              (entity) => OrderLines.deleteOrderLineViaApi(entity.id),
            );

            return Orders.updateOrderViaApi({
              ...order,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          });
      });
  };

  const performTestAndCommonRollovers = (flow) => {
    const typeMap = flow.get(R.FUND_TYPES);

    const buildRollover = () => {
      return LedgerRollovers.generateLedgerRollover({
        ledger: flow.get(R.LEDGER),
        fromFiscalYear: flow.get(R.INITIAL_FISCAL_YEAR),
        toFiscalYear: flow.get(R.NEXT_FISCAL_YEAR),
        needCloseBudgets: true,
        budgetsRollover: FUND_SCENARIOS.map((scenario) => ({
          fundTypeId: typeMap[scenario.type].id,
          rolloverAllocation: true,
          adjustAllocation: scenario.adjustAllocation,
          rolloverBudgetValue: scenario.rolloverBudgetValue,
          addAvailableTo: scenario.addAvailableTo,
        })),
        encumbrancesRollover: [
          {
            orderType: 'One-time',
            basedOn: 'InitialAmount',
            increaseBy: -1.5,
          },
        ],
      });
    };

    const createAndRegisterRollover = (rolloverType) => {
      return LedgerRollovers.createLedgerRolloverViaApi({
        ...buildRollover(),
        rolloverType,
      }).then((rollover) => {
        register(
          flow,
          `${String(rolloverType)}-${rollover.id}`,
          rollover,
          (entity) => LedgerRollovers.deleteLedgerRolloverViaApi(entity.id),
        );
      });
    };

    return createAndRegisterRollover(LEDGER_ROLLOVER_TYPES.PREVIEW)
      .then(() => createAndRegisterRollover(LEDGER_ROLLOVER_TYPES.COMMIT));
  };

  const createTestUser = (flow) => {
    return cy.createTempUser([
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
    ]).then((userProperties) => {
      return register(
        flow,
        R.USER_PROPERTIES,
        userProperties,
        (entity) => Users.deleteViaApi(entity.userId),
      );
    });
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
    createFundTypes,
    createFundsWithBudgetsByType,
    createOpenOrderWithThreeFundDistributions,
    performTestAndCommonRollovers,
    createTestUser,
    loginToLedgerPane,
  };
}
