import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  BUDGET_DETAIL_FIELDS,
  BUDGET_STATUSES,
  FINANCIAL_ACTIVITY_OVERRAGES,
  FUND_DISTRIBUTION_TYPES,
  FUNDING_INFORMATION_NAMES,
  INVOICE_STATUSES,
  LEDGER_ROLLOVER_BUDGET_VALUE_LABELS,
  LEDGER_ROLLOVER_SOURCE_LABELS,
  LEDGER_ROLLOVER_STATUS_LABELS,
  LEDGER_ROLLOVER_TYPES,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS,
  ROLLOVER_RESULT_CSV_HEADERS,
} from '../../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  LedgerDetails,
  LedgerRolloverDetails,
  LedgerRolloverInProgress,
  LedgerRollovers,
  Ledgers,
} from '../../../support/fragments/finance';
import { Invoices } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { CodeTools, DateTools, NumberTools, StringTools } from '../../../support/utils';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const code = CodeTools(4);
    const allocatedAmount = 100;
    const resultFileName = `${DateTools.getCurrentDateForFileNaming()}-result.csv`;
    const resultsColumnValue = `${DateTools.getCurrentDate()}-result`;

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
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
      fund: {},
      budget: {},
      acquisitionMethodId: null,
      order1: {},
      order2: {},
      orderLine1: {},
      orderLine2: {},
      invoice: {},
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

    const createFundWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        ledgerId: testData.ledger.id,
      }).then((fundResponse) => {
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

    const createOpenOrderWithLine = (orderKey, orderLineKey, order, price) => {
      return Orders.createOrderViaApi({ ...order, reEncumber: true })
        .then((orderResponse) => {
          testData[orderKey] = orderResponse;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: testData.acquisitionMethodId,
              purchaseOrderId: testData[orderKey].id,
              title: `AT_C376611_${orderLineKey}_${getRandomPostfix()}`,
              listUnitPrice: price,
              poLineEstimatedPrice: price,
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
          testData[orderLineKey] = orderLine;

          return Orders.updateOrderViaApi({
            ...testData[orderKey],
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        })
        .then(() => {
          return OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id);
        })
        .then((orderLine) => {
          testData[orderLineKey] = orderLine;
        });
    };

    const createOneTimeOrder = () => {
      return createOpenOrderWithLine(
        'order1',
        'orderLine1',
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        40,
      );
    };

    const createOngoingOrder = () => {
      return createOpenOrderWithLine(
        'order2',
        'orderLine2',
        NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: { isSubscription: false, manualRenewal: false },
        }),
        10,
      );
    };

    const createAndPayInvoice = () => {
      return cy
        .getBatchGroups()
        .then((batchGroup) => {
          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            poLineId: testData.orderLine1.id,
            fiscalYearId: testData.fiscalYears.first.id,
            batchGroupId: batchGroup.id,
            fundDistributions: testData.orderLine1.fundDistribution,
            subTotal: testData.orderLine1.cost.poLineEstimatedPrice,
            releaseEncumbrance: true,
            exportToAccounting: true,
          });
        })
        .then((invoice) => {
          testData.invoice = invoice;

          return Invoices.changeInvoiceStatusViaApi({
            invoice: testData.invoice,
            status: INVOICE_STATUSES.PAID,
          });
        });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceExecuteFiscalYearRollover.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewLedger.gui,
          Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
          Permissions.uiOrdersView.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ledgerPath,
            waiter: Ledgers.waitLoading,
          });
          Ledgers.searchByName(testData.ledger.name);
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });

      createConsecutiveFiscalYears()
        .then(createLedger)
        .then(createFundWithBudget)
        .then(createOrganization)
        .then(getAcquisitionMethodId)
        .then(createOneTimeOrder)
        .then(createAndPayInvoice)
        .then(createOngoingOrder)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${resultFileName}`);
      });
    });

    it(
      'C376611 Rollover allocation with "None" option selected in "Rollover budget value" dropdown (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C376611'] },
      () => {
        const format = (value) => NumberTools.formatCurrency(value, testData.locale);
        const rolloverFields = {
          fiscalYear: testData.fiscalYears.second.code,
          rolloverBudgets: [
            {
              checked: true,
              rolloverBudget: LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
              rolloverValue: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
            },
          ],
        };

        // Step 1: Open ledger details pane
        Ledgers.selectLedger(testData.ledger.name);

        // Steps 2-3: Open rollover form and fill in rollover settings
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields(rolloverFields);

        // Steps 4-6: Run test rollover
        LedgerRolloverDetails.clickTestRolloverButton();

        // Step 7: Check rollover logs
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

        // Step 8: Export test rollover result
        FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${resultFileName}`);
        LedgerRollovers.exportRolloverResult();

        // Step 9: Check "<mm_dd_yyyy>-result.csv" file content
        Ledgers.checkRolloverResultCsvContent({
          fileName: resultFileName,
          funds: [
            {
              name: testData.fund.name,
              columns: {
                [ROLLOVER_RESULT_CSV_HEADERS.INITIAL_ALLOCATION]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOCATED_INCREASE]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.ALLOCATED_DECREASE]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_ALLOCATED]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.TRANSFERS]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.TOTAL_FUNDING]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.BUDGET_ENCUMBERED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.AWAITING_PAYMENT]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.UNAVAILABLE]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.OVER_ENCUMBERED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.OVER_EXPENDED]: 0,
                [ROLLOVER_RESULT_CSV_HEADERS.CASH_BALANCE]: 100,
                [ROLLOVER_RESULT_CSV_HEADERS.AVAILABLE]: 100,
              },
            },
          ],
        });

        // Steps 10-11: Go back to ledger and fill in the same rollover settings
        Ledgers.closeOpenedPage();
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(testData.ledger.name);
        Ledgers.selectLedger(testData.ledger.name);
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields(rolloverFields);

        // Steps 12-14: Execute rollover
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();

        // Step 15: Click "Close & view ledger details" button
        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();

        // Step 16: Check planned budget of the fund
        LedgerDetails.openFundDetails(testData.fund.name);
        FundDetails.checkFundDetails({
          plannedBudgets: [
            {
              name: `${testData.fund.code}-${testData.fiscalYears.second.code}`,
              allocated: format(allocatedAmount),
              unavailable: format(0),
              available: format(allocatedAmount),
            },
          ],
        });

        // Steps 17-19: Check planned budget details
        FundDetails.openPlannedBudgetDetails().checkBudgetDetails({
          information: [{ key: BUDGET_DETAIL_FIELDS.BUDGET_STATUS, value: BUDGET_STATUSES.ACTIVE }],
          summary: [
            { key: FUNDING_INFORMATION_NAMES.INITIAL_ALLOCATION, value: format(allocatedAmount) },
            { key: FUNDING_INFORMATION_NAMES.INCREASE_IN_ALLOCATION, value: format(0) },
            { key: FUNDING_INFORMATION_NAMES.DECREASE_IN_ALLOCATION, value: format(0) },
            { key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: format(allocatedAmount) },
            { key: FUNDING_INFORMATION_NAMES.NET_TRANSFERS, value: format(0) },
            { key: FUNDING_INFORMATION_NAMES.TOTAL_FUNDING, value: format(allocatedAmount) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.ENCUMBERED, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.AWAITING_PAYMENT, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.EXPENDED, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.UNAVAILABLE, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_ENCUMBRANCE, value: format(0) },
            { key: FINANCIAL_ACTIVITY_OVERRAGES.OVER_EXPENDED, value: format(0) },
          ],
          balance: { cash: format(allocatedAmount), available: format(allocatedAmount) },
        });
      },
    );
  });
});
