import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
} from '../../support/constants';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  LedgerDetails,
  LedgerRolloverDetails,
  LedgerRolloverInProgress,
  LedgerRollovers,
  Ledgers,
} from '../../support/fragments/finance';
import { Invoices, InvoiceEditForm, InvoiceView } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  describe('Order lines', () => {
    const code = CodeTools(4);
    const invoiceData = {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroup: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNumber: `autotest_first${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    };

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
        third: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_C${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}03`,
          ...DateTools.getFullFiscalYearStartAndEnd(2),
        },
      },
      ledgerA: {},
      fundA: {},
      budgetA: {},
      acquisitionMethodId: null,
      order1: {},
      orderLine1: {},
      invoice1: {},
      user: {},
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first')
        .then(() => createFiscalYear('second'))
        .then(() => createFiscalYear('third'));
    };

    const createLedgerA = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        name: `autotest_ledgerA_${getRandomPostfix()}`,
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledger) => {
        testData.ledgerA = ledger;
      });
    };

    const createFundAWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `autotest_fundA_${getRandomPostfix()}`,
        code: `autotest_fundA_${getRandomPostfix()}`,
        ledgerId: testData.ledgerA.id,
      }).then((fundResponse) => {
        testData.fundA = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: testData.fundA.id,
          allocated: 1000,
        }).then((budget) => {
          testData.budgetA = budget;
        });
      });
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      if (testData.acquisitionMethodId) return cy.wrap(testData.acquisitionMethodId);

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
          return testData.acquisitionMethodId;
        });
    };

    const createOrder1WithLine = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: { isSubscription: false, manualRenewal: false },
        }),
        reEncumber: true,
      })
        .then((order) => {
          testData.order1 = order;
          return getAcquisitionMethodId();
        })
        .then((acquisitionMethodId) => {
          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: acquisitionMethodId,
              purchaseOrderId: testData.order1.id,
              listUnitPrice: 50,
              poLineEstimatedPrice: 50,
            }),
          );
        })
        .then((orderLine) => {
          testData.orderLine1 = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order1,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createAndPayInvoice1 = () => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYears.first.id,
        poLineId: testData.orderLine1.id,
        fundDistributions: [
          {
            code: testData.fundA.code,
            fundId: testData.fundA.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        invoiceStatus: INVOICE_STATUSES.OPEN,
        subTotal: 50,
        releaseEncumbrance: true,
        exportToAccounting: true,
      }).then((invoice) => {
        testData.invoice1 = invoice;

        return Invoices.changeInvoiceStatusViaApi({
          invoice: testData.invoice1,
          status: INVOICE_STATUSES.PAID,
        });
      });
    };

    const rolloverLedgerAToSecondFiscalYear = () => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledgerA,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
        }),
      );
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewEditFiscalYear.gui,
          Permissions.uiFinanceViewLedger.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
          Permissions.uiInvoicesApproveInvoices.gui,
          Permissions.uiInvoicesPayInvoices.gui,
          Permissions.uiOrdersReopenPurchaseOrders.gui,
          Permissions.uiOrdersCancelPurchaseOrders.gui,
          Permissions.uiFinanceExecuteFiscalYearRollover.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      createConsecutiveFiscalYears()
        .then(createLedgerA)
        .then(createFundAWithBudget)
        .then(createOrganization)
        .then(createOrder1WithLine)
        .then(createAndPayInvoice1)
        .then(rolloverLedgerAToSecondFiscalYear)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C784429 PO summary displays correct values for the selected fiscal year after adding a fund to an existing order in a new fiscal year (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C784429', 'nonParallel'] },
      () => {
        // Step 1: Check PO summary and fiscal year dropdown is not displayed
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
        Orders.selectFromResultsList(testData.order1.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 2: Change dates of first and second fiscal years so that the second fiscal year includes the current date
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
        FinanceHelper.selectFiscalYearsNavigation();

        const currentYear = new Date().getFullYear();

        [
          { fiscalYear: testData.fiscalYears.first.name, year: currentYear - 1 },
          { fiscalYear: testData.fiscalYears.second.name, year: currentYear },
          { fiscalYear: testData.fiscalYears.third.name, year: currentYear + 1 },
        ].forEach(({ fiscalYear, year }) => {
          FinanceHelper.searchByName(fiscalYear);
          FiscalYears.selectFY(fiscalYear);
          FiscalYears.editFiscalYearDetails();
          FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
            `01/01/${year}`,
            `12/31/${year}`,
          );
        });

        // Step 3: Go back to the Order and check PO summary is the same as in step 1
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);

        Orders.waitLoading();
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
        Orders.selectOrderByPONumber(testData.order1.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Steps 4-5: Add Fund A to the PO line
        OrderDetails.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        OrderLineDetails.openOrderLineEditForm();
        OrderLineEditForm.clickAddFundDistributionButton();
        OrderLineEditForm.selectFundDistribution(testData.fundA.name, 0);
        OrderLineEditForm.clickSaveButton();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fundA.name }]);

        // Step 6: Go back to Order, check PO summary (fiscal year dropdown with current FY selected)
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Steps 7-8: Create a new invoice from the order and save it
        OrderDetails.createNewInvoice({ confirm: true });
        InvoiceEditForm.waitLoading();
        InvoiceEditForm.fillInvoiceFields({
          invoiceDate: invoiceData.invoiceDate,
          batchGroupName: invoiceData.batchGroup,
          vendorInvoiceNo: invoiceData.vendorInvoiceNumber,
          paymentMethod: invoiceData.paymentMethod,
        });

        InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });
        InvoiceView.waitLoading();
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$50.00' },
          ],
        });

        // Step 9: Approve the invoice
        InvoiceView.approveInvoice();
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
          ],
        });

        // Step 10: Pay the invoice
        InvoiceView.payInvoice();
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
          ],
        });

        // Step 11: Go back to the Order and check PO summary
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
        Orders.waitLoading();
        Orders.selectOrderByPONumber(testData.order1.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Steps 12-14: Navigate to  Ledger A, perform rollover to the third fiscal year
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(testData.ledgerA.name);
        Ledgers.selectLedger(testData.ledgerA.name);
        LedgerDetails.openLedgerRolloverEditForm();
        LedgerRolloverDetails.fillLedgerRolloverFields({
          fiscalYear: testData.fiscalYears.third.code,
          rolloverBudgets: [{ checked: true, rolloverValue: 'Allocation' }],
          rolloverEncumbrance: {
            ongoing: { checked: true, basedOn: 'Initial encumbrance' },
          },
        });
        LedgerRolloverDetails.clickRolloverButton();
        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails();

        // Step 15: Go back to the Order, check FY dropdown displays second and third fiscal years
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
        Orders.waitLoading();
        Orders.selectOrderByPONumber(testData.order1.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code, testData.fiscalYears.second.code],
          previous: [],
        });

        // Step 16: Change dates of second and third fiscal years so that the third fiscal year includes the current date
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
        FinanceHelper.selectFiscalYearsNavigation();

        [
          { fiscalYear: testData.fiscalYears.first.name, year: currentYear - 2 },
          { fiscalYear: testData.fiscalYears.second.name, year: currentYear - 1 },
          { fiscalYear: testData.fiscalYears.third.name, year: currentYear },
        ].forEach(({ fiscalYear, year }) => {
          FinanceHelper.searchByName(fiscalYear);
          FiscalYears.selectFY(fiscalYear);
          FiscalYears.editFiscalYearDetails();
          FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
            `01/01/${year}`,
            `12/31/${year}`,
          );
        });

        // Step 17: Go back to the Order, check PO summary for the current (third) fiscal year
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
        Orders.waitLoading();
        Orders.selectOrderByPONumber(testData.order1.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 18: Expand fiscal year dropdown, check it contains second and third fiscal years
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code],
        });

        // Step 19: Select the second fiscal year, check PO summary for that fiscal year
        OrderDetails.selectFiscalYear(testData.fiscalYears.second.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 20: Cancel the order
        OrderDetails.closeOrder({
          orderNumber: testData.order1.poNumber,
          confirm: true,
          checkSuccess: true,
        });
        OrderDetails.selectFiscalYear(testData.fiscalYears.third.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code],
        });

        // Step 21: Reopen the order
        OrderDetails.reOpenOrder({ orderNumber: testData.order1.poNumber });
        OrderDetails.selectFiscalYear(testData.fiscalYears.third.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code],
        });
      },
    );
  });
});
