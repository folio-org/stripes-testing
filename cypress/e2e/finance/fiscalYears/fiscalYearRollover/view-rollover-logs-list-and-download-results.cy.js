import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  LEDGER_ROLLOVER_LOGS_COLUMNS,
  LEDGER_ROLLOVER_LOGS_FILTERS,
  LEDGER_ROLLOVER_ORDER_TYPES,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  ROLLOVER_ERROR_MESSAGES,
  ROLLOVER_ERROR_TYPES,
  ROLLOVER_FAILED_ACTIONS,
  ROLLOVER_RESULT_CSV_HEADERS,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  LedgerDetails,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';

describe('Finance', () => {
  describe('Fiscal year rollover', () => {
    const fiscalYearSeries = `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}`;
    const fileNameDate = DateTools.getCurrentDateForFileNaming();
    const errorFileName = `${fileNameDate}-error.csv`;
    const resultFileName = `${fileNameDate}-result.csv`;
    const rolloverDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const logFileDate = DateTools.getCurrentDate();

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears: {
        first: {},
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          code: `${fiscalYearSeries}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledger: {},
      fund: {},
      acquisitionMethodId: null,
      order: {},
      orderLine: {},
      failedRollover: {},
      user: {},
    };

    const createBudgetWithFundLedgerAndFiscalYear = () => {
      const { fiscalYear, ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: {
          code: `${fiscalYearSeries}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        budget: { allocated: 100 },
      });

      testData.fiscalYears.first = fiscalYear;
      testData.ledger = ledger;
      testData.fund = fund;
    };

    const createNextFiscalYear = () => {
      return FiscalYears.createViaApi(testData.fiscalYears.second).then((fiscalYear) => {
        testData.fiscalYears.second = fiscalYear;
      });
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
        });
    };

    const createOpenOneTimeOrderWithLine = () => {
      return getAcquisitionMethodId()
        .then(() => {
          return Orders.createOrderViaApi({
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          });
        })
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
              fundDistribution: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            }),
          );
        })
        .then((orderLine) => {
          testData.orderLine = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createSuccessfulTestRollover = () => {
      return LedgerRollovers.createLedgerRolloverViaApi({
        ...LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          encumbrancesRollover: [],
        }),
        rolloverType: LEDGER_ROLLOVER_TYPES.PREVIEW,
      });
    };

    const createFailedTestRollover = () => {
      return LedgerRollovers.createLedgerRolloverViaApi({
        ...LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          budgetsRollover: [
            {
              rolloverAllocation: false,
              rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
              addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
            },
          ],
          encumbrancesRollover: [
            {
              orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
              basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
            },
          ],
        }),
        rolloverType: LEDGER_ROLLOVER_TYPES.PREVIEW,
      }).then((rollover) => {
        testData.failedRollover = rollover;
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceExecuteFiscalYearRollover.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewGroups.gui,
          Permissions.uiFinanceViewEditLedger.gui,
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
        .then(createNextFiscalYear)
        .then(createOrganization)
        .then(createOpenOneTimeOrderWithLine)
        .then(createSuccessfulTestRollover)
        .then(createFailedTestRollover)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      [errorFileName, resultFileName].forEach((fileName) => {
        FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${fileName}`);
      });
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C365112 View "Rollover logs" list and download results (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C365112', 'nonParallel'] },
      () => {
        // Step 1: Open the ledger details
        FinanceHelper.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Step 2: Open "Rollover logs" page
        LedgerDetails.openLedgerRolloverLogs();

        // Step 3: Check "Search & filter" pane elements
        LedgerRollovers.checkFiltersPane({
          dateFilters: [
            LEDGER_ROLLOVER_LOGS_FILTERS.START_TIME,
            LEDGER_ROLLOVER_LOGS_FILTERS.END_TIME,
          ],
          checkboxFilters: [
            {
              label: LEDGER_ROLLOVER_LOGS_FILTERS.STATUS,
              options: [
                LEDGER_ROLLOVER_STATUS_LABELS.IN_PROGRESS,
                LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
                LEDGER_ROLLOVER_STATUS_LABELS.FAILED,
              ],
            },
            {
              label: LEDGER_ROLLOVER_LOGS_FILTERS.SOURCE,
              options: Object.values(LEDGER_ROLLOVER_SOURCE_LABELS),
            },
          ],
        });

        // Step 4: Check "Rollover logs" results columns
        LedgerRollovers.checkTableContent({
          columns: Object.values(LEDGER_ROLLOVER_LOGS_COLUMNS),
          records: [
            {
              startTime: rolloverDate,
              endTime: rolloverDate,
              status: LEDGER_ROLLOVER_STATUS_LABELS.FAILED,
              errors: `${logFileDate}-error`,
              results: `${logFileDate}-result`,
              settings: `${logFileDate}-settings`,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
            },
            {
              startTime: rolloverDate,
              endTime: rolloverDate,
              status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
              results: `${logFileDate}-result`,
              settings: `${logFileDate}-settings`,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
            },
          ],
        });

        // Steps 5-6: Download and check the errors file
        Ledgers.exportRolloverError(logFileDate);
        Ledgers.checkDownloadedErrorFile({
          fileName: errorFileName,
          ledgerRolloverId: testData.failedRollover.id,
          errorType: ROLLOVER_ERROR_TYPES.ORDER,
          failedAction: ROLLOVER_FAILED_ACTIONS.CREATE_ENCUMBRANCE,
          errorMessage: ROLLOVER_ERROR_MESSAGES.INSUFFICIENT_FUNDS,
          amount: 10,
          fundId: testData.fund.id,
          // uncomment after MODFIN-260 will be resolved
          // fundCode: testData.fund.code,
          orderId: testData.order.id,
          // uncomment after MODFIN-260 will be resolved
          // orderLineNumber: testData.orderLine.poLineNumber,
          orderLineId: testData.orderLine.id,
        });

        // Steps 7-8: Download and check the results file
        LedgerRollovers.exportRolloverResult({ row: 1 });
        Ledgers.checkRolloverResultCsvContent({
          fileName: resultFileName,
          funds: [
            {
              name: testData.fund.name,
              columns: {
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_CODE]: testData.fund.code,
                [ROLLOVER_RESULT_CSV_HEADERS.INITIAL_ALLOCATION]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_ALLOCATED]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_FUNDING]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.CASH_BALANCE]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.AVAILABLE]: 100,
              },
            },
          ],
        });

        // Step 9: Close "Rollover logs" page
        Ledgers.closeOpenedPage();
        LedgerDetails.verifyLedgerName(testData.ledger.name);
      },
    );
  });
});
