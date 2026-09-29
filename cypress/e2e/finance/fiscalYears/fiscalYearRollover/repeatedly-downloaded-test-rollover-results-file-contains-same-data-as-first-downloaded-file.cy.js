import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  BUDGET_STATUSES,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  LEDGER_ROLLOVER_BUDGET_VALUE_LABELS,
  LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS_LABELS,
  ROLLOVER_RESULT_CSV_HEADERS,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  LedgerDetails,
  LedgerRolloverDetails,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import ExpenseClasses from '../../../../support/fragments/settings/finance/expenseClasses';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';

describe('Finance', () => {
  describe('Fiscal year rollover', () => {
    const fiscalYearSeries = `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}`;
    const resultFilePath = `${Cypress.config('downloadsFolder')}/${DateTools.getCurrentDateForFileNaming()}-result.csv`;
    const resultsColumnValue = `${DateTools.getCurrentDate()}-result`;

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
      expenseClasses: {
        first: ExpenseClasses.getDefaultExpenseClass(),
        second: ExpenseClasses.getDefaultExpenseClass(),
      },
      ledger: {},
      fund: {},
      acquisitionMethodId: null,
      ongoingOrder: {},
      ongoingOrderLine: {},
      oneTimeOrder: {},
      oneTimeOrderLine: {},
      resultFileContent: '',
      user: {},
    };

    const createExpenseClass = (expenseClassKey) => {
      return ExpenseClasses.createExpenseClassViaApi(testData.expenseClasses[expenseClassKey]).then(
        (expenseClass) => {
          testData.expenseClasses[expenseClassKey] = expenseClass;
        },
      );
    };

    const createExpenseClasses = () => {
      return createExpenseClass('first').then(() => createExpenseClass('second'));
    };

    const createBudgetWithFundLedgerAndFiscalYear = () => {
      const { fiscalYear, ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: {
          code: `${fiscalYearSeries}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        budget: { allocated: 1000 },
        expenseClasses: Object.values(testData.expenseClasses),
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

    const createOpenOrderWithLine = (orderKey, orderLineKey, order, price, expenseClass) => {
      return Orders.createOrderViaApi({ ...order, reEncumber: true })
        .then((orderResponse) => {
          testData[orderKey] = orderResponse;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: orderResponse.id,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: price,
              poLineEstimatedPrice: price,
              fundDistribution: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  expenseClassId: expenseClass.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            }),
          );
        })
        .then((orderLine) => {
          testData[orderLineKey] = orderLine;

          return Orders.updateOrderViaApi({
            ...testData[orderKey],
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createOngoingOrder = () => {
      return createOpenOrderWithLine(
        'ongoingOrder',
        'ongoingOrderLine',
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        100,
        testData.expenseClasses.first,
      );
    };

    const createOneTimeOrder = () => {
      return createOpenOrderWithLine(
        'oneTimeOrder',
        'oneTimeOrderLine',
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        200,
        testData.expenseClasses.second,
      );
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceExecuteFiscalYearRollover.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewLedger.gui,
          Permissions.uiUsersView.gui,
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

      cy.then(createExpenseClasses)
        .then(createBudgetWithFundLedgerAndFiscalYear)
        .then(createNextFiscalYear)
        .then(createOrganization)
        .then(getAcquisitionMethodId)
        .then(createOngoingOrder)
        .then(createOneTimeOrder)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      FileManager.deleteFile(resultFilePath);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C366528 Repeatedly downloaded test rollover results ".csv" file for specific test rollover after the next test rollovers executing contains the same data as firstly downloaded file (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C366528', 'nonParallel'] },
      () => {
        // Step 1: Open the ledger details
        FinanceHelper.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Steps 2-3: Open the rollover form and fill in the rollover settings based on initial encumbrance
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: testData.fiscalYears.second.code,
          rolloverBudgets: [
            {
              checked: true,
              rolloverBudget: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
              rolloverValue: ROLLOVER_BUDGET_VALUE_AS_LABELS.TRANSFER,
            },
          ],
          rolloverEncumbrance: {
            ongoing: {
              checked: true,
              basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE,
            },
            oneTime: {
              checked: true,
              basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.INITIAL_ENCUMBRANCE,
            },
          },
        });

        // Steps 4-6: Run the test rollover
        LedgerRolloverDetails.clickTestRolloverButton();
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Step 7: Check the rollover logs
        Ledgers.rolloverLogs();
        LedgerRollovers.checkTableContent({
          records: [
            {
              status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
              results: resultsColumnValue,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
            },
          ],
        });

        // Step 8: Download the test rollover results
        LedgerRollovers.exportRolloverResult();

        // Steps 9-11: Check the rows for both expense classes
        Ledgers.checkRolloverResultCsvContent({
          fileName: `${DateTools.getCurrentDateForFileNaming()}-result.csv`,
          funds: [
            {
              name: testData.fund.name,
              expenseClassName: testData.expenseClasses.first.name,
              columns: {
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_NAME]: testData.fund.name,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_CODE]: testData.fund.code,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_STATUS]: testData.fund.fundStatus,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_TYPE]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_GROUPS]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.ACQ_UNITS]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.TRANSFER_FROM]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.TRANSFER_TO]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.EXTERNAL_ACCOUNT_NO]: testData.fund.externalAccountNo,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_DESCRIPTION]: testData.fund.description,
                [ROLLOVER_RESULT_CSV_HEADERS.BUDGET_NAME]: `${testData.fund.code}-${testData.fiscalYears.second.code}`,
                [ROLLOVER_RESULT_CSV_HEADERS.BUDGET_STATUS]: BUDGET_STATUSES.ACTIVE,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOWABLE_ENCUMBRANCE]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOWABLE_EXPENDITURE]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.INITIAL_ALLOCATION]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOCATED_INCREASE]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOCATED_DECREASE]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_ALLOCATED]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.TRANSFERS]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_FUNDING]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.BUDGET_ENCUMBERED]: 300,
                [ROLLOVER_RESULT_CSV_HEADERS.AWAITING_PAYMENT]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.CREDITED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.UNAVAILABLE]: 300,
                [ROLLOVER_RESULT_CSV_HEADERS.OVER_ENCUMBERED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.OVER_EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.CASH_BALANCE]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.AVAILABLE]: 700,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_NAME]:
                  testData.expenseClasses.first.name,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_CODE]:
                  testData.expenseClasses.first.code,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_STATUS]: EXPENSE_CLASS_STATUSES.ACTIVE,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_ENCUMBERED]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_AWAITING_PAYMENT]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_CREDITED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.PERCENTAGE_OF_TOTAL_EXPENDED]: '',
              },
            },
            {
              name: testData.fund.name,
              expenseClassName: testData.expenseClasses.second.name,
              columns: {
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_NAME]: testData.fund.name,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_CODE]: testData.fund.code,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_STATUS]: testData.fund.fundStatus,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_TYPE]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_GROUPS]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.ACQ_UNITS]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.TRANSFER_FROM]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.TRANSFER_TO]: '',
                [ROLLOVER_RESULT_CSV_HEADERS.EXTERNAL_ACCOUNT_NO]: testData.fund.externalAccountNo,
                [ROLLOVER_RESULT_CSV_HEADERS.FUND_DESCRIPTION]: testData.fund.description,
                [ROLLOVER_RESULT_CSV_HEADERS.BUDGET_NAME]: `${testData.fund.code}-${testData.fiscalYears.second.code}`,
                [ROLLOVER_RESULT_CSV_HEADERS.BUDGET_STATUS]: BUDGET_STATUSES.ACTIVE,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOWABLE_ENCUMBRANCE]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOWABLE_EXPENDITURE]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.INITIAL_ALLOCATION]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOCATED_INCREASE]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOCATED_DECREASE]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_ALLOCATED]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.TRANSFERS]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_FUNDING]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.BUDGET_ENCUMBERED]: 300,
                [ROLLOVER_RESULT_CSV_HEADERS.AWAITING_PAYMENT]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.CREDITED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.UNAVAILABLE]: 300,
                [ROLLOVER_RESULT_CSV_HEADERS.OVER_ENCUMBERED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.OVER_EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.CASH_BALANCE]: 1000,
                [ROLLOVER_RESULT_CSV_HEADERS.AVAILABLE]: 700,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_NAME]:
                  testData.expenseClasses.second.name,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_CODE]:
                  testData.expenseClasses.second.code,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_STATUS]: EXPENSE_CLASS_STATUSES.ACTIVE,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_ENCUMBERED]: 200,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_AWAITING_PAYMENT]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENSE_CLASS_CREDITED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.PERCENTAGE_OF_TOTAL_EXPENDED]: '',
              },
            },
          ],
        });
        FileManager.readFile(resultFilePath).then((fileContent) => {
          testData.resultFileContent = fileContent;
        });
        FileManager.deleteFile(resultFilePath);

        // Step 12: Go back to the ledger details
        Ledgers.closeOpenedPage();
        LedgerDetails.verifyLedgerName(testData.ledger.name);

        // Steps 13-14: Open the rollover form and fill in the rollover settings based on expended
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: testData.fiscalYears.second.code,
          rolloverBudgets: [
            {
              checked: true,
              rolloverBudget: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
              rolloverValue: ROLLOVER_BUDGET_VALUE_AS_LABELS.TRANSFER,
            },
          ],
          rolloverEncumbrance: {
            ongoing: {
              checked: true,
              basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.EXPENDED,
            },
            oneTime: {
              checked: true,
              basedOn: LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS.EXPENDED,
            },
          },
        });

        // Step 15: Run the second test rollover and check the rollover logs
        LedgerRolloverDetails.clickTestRolloverButton();
        LedgerDetails.verifyLedgerName(testData.ledger.name);
        Ledgers.rolloverLogs();
        LedgerRollovers.checkTableContent({
          records: [
            {
              status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
              results: resultsColumnValue,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
            },
            {
              status: LEDGER_ROLLOVER_STATUS_LABELS.SUCCESS,
              results: resultsColumnValue,
              source: LEDGER_ROLLOVER_SOURCE_LABELS[LEDGER_ROLLOVER_TYPES.PREVIEW],
            },
          ],
        });

        // Step 16: Download the results of the first test rollover (rollover logs are listed from the newest one)
        LedgerRollovers.exportRolloverResult({ row: 1 });

        // Step 17: The repeatedly downloaded file contains the same data as the first one
        FileManager.readFile(resultFilePath).then((fileContent) => {
          expect(fileContent, 'Repeatedly downloaded results file').to.equal(
            testData.resultFileContent,
          );
        });
      },
    );
  });
});
