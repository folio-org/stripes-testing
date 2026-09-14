import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_POL_PAYMENT_STATUSES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  LEDGER_ROLLOVER_ORDER_TYPES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
  TransactionDetails,
} from '../../support/fragments/finance';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import CancelInvoiceModal from '../../support/fragments/invoices/modal/cancelInvoiceModal';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UpdatePOLinePaymentStatusModal from '../../support/fragments/invoices/modal/updatePOLinePaymentStatusModal';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const code = CodeTools(4);

  const testData = {
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
    },
    organization: NewOrganization.getDefaultOrganization(),
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
    cancellationNote: 'Cancellation note',
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
        allocated: 1000,
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

  const createOpenOrderWithLine = (orderKey, orderLineKey, price) => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    })
      .then((order) => {
        testData[orderKey] = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: testData[orderKey].id,
            title: `AT_C700861_${orderLineKey}_${getRandomPostfix()}`,
            acquisitionMethod: testData.acquisitionMethodId,
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
      });
  };

  const createOpenOrders = () => {
    return createOpenOrderWithLine('order1', 'orderLine1', 25).then(() => createOpenOrderWithLine('order2', 'orderLine2', 50));
  };

  const createAndApproveInvoice = () => {
    return OrderLines.getOrderLineByIdViaApi(testData.orderLine1.id)
      .then((orderLine) => {
        testData.orderLine1 = orderLine;

        return OrderLines.getOrderLineByIdViaApi(testData.orderLine2.id);
      })
      .then((orderLine) => {
        testData.orderLine2 = orderLine;

        return cy.getBatchGroups();
      })
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

        return Invoices.createInvoiceLineViaApi(
          Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: invoice.status,
            poLineId: testData.orderLine2.id,
            fundDistributions: testData.orderLine2.fundDistribution,
            accountingCode: testData.organization.erpCode,
            subTotal: testData.orderLine2.cost.poLineEstimatedPrice,
            releaseEncumbrance: true,
          }),
        );
      })
      .then(() => {
        return Invoices.changeInvoiceStatusViaApi({
          invoice: testData.invoice,
          status: INVOICE_STATUSES.APPROVED,
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
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
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
    Approvals.setApprovePayValueViaApi(false);

    createConsecutiveFiscalYears()
      .then(createLedger)
      .then(createFundWithBudget)
      .then(createOrganization)
      .then(getAcquisitionMethodId)
      .then(createOpenOrders)
      .then(createAndApproveInvoice)
      .then(rolloverToSecondFiscalYear)
      .then(shiftFiscalYearDates)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C700861 POL payment status is updated to "Fully paid" for two orders when cancelling an invoice against a previous fiscal year (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C700861', 'nonParallel'] },
    () => {
      // Step 1: Navigate to POL details pane related to the Order #1
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.orderLine1.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 2: Navigate to POL details pane related to the Order #2
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      Orders.selectOrderByPONumber(testData.order2.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(testData.orderLine2.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 3: Navigate to invoice details pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.openInvoice(testData.invoice.id);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
        invoiceLines: [
          { poNumber: testData.orderLine1.poLineNumber },
          { poNumber: testData.orderLine2.poLineNumber },
        ],
      });

      // Step 4: Cancel invoice and verify Cancel invoice modal
      InvoiceView.clickCancelInActionsMenu();
      CancelInvoiceModal.verifyModalView();

      // Step 5: Fill in cancellation note and submit Cancel invoice modal, verify Update order status modal
      CancelInvoiceModal.fillInCancelationNote(testData.cancellationNote);
      CancelInvoiceModal.clickSubmitButton(false);
      UpdatePOLinePaymentStatusModal.verifyModalView();

      // Step 6: Select Fully paid option
      UpdatePOLinePaymentStatusModal.selectPaymentStatus(
        INVOICE_POL_PAYMENT_STATUSES.FULLY_PAID_UI,
      );
      UpdatePOLinePaymentStatusModal.clickSubmitButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.CANCELLATION_NOTE, value: testData.cancellationNote },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 7: Click invoice line #1 related to the Order #1
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 8: Check encumbrance for the previous FY
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.AMOUNT,
            value: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 9: Click POL number hyperlink, check payment status and current encumbrance
      TransactionDetails.openSourceInTransactionDetails(testData.orderLine1.poLineNumber);
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 10: Click invoice line #2 related to the Order #2
      OrderLines.viewPO();
      OrderDetails.waitLoading();
      OrderDetails.openInvoice(testData.invoice.id);
      InvoiceView.waitLoading();
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
        },
      ]);

      // Step 11: Check encumbrance for the previous FY
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          {
            key: TRANSACTION_DETAIL_FIELDS.AMOUNT,
            value: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 12: Click POL number hyperlink, check payment status and current encumbrance
      TransactionDetails.openSourceInTransactionDetails(testData.orderLine2.poLineNumber);
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00`,
        },
      ]);
    },
  );
});
