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
  ORDER_LINE_PAYMENT_STATUSES_API,
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
import { BasicOrderLine, NewOrder, OrderDetails, OrderLineDetails, OrderLines, Orders } from '../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
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
        name: `AT_C700857_FY_first_${getRandomPostfix()}`,
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `AT_C700857_FY_second_${getRandomPostfix()}`,
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
    },
    organization: NewOrganization.getDefaultOrganization(),
    ledger: {},
    fund: {},
    budget: {},
    acquisitionMethodId: null,
    order: {},
    orderLine1: {},
    orderLine2: {},
    orderLine3: {},
    invoice: {},
    user: {},
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
    return cy.getAcquisitionMethodsApi({ query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"` }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });
  };

  const getOrderLine = (orderLineKey, price) => {
    return BasicOrderLine.getDefaultOrderLine({
      purchaseOrderId: testData.order.id,
      title: `AT_C700857_OrderLine_${orderLineKey}_${getRandomPostfix()}`,
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
    });
  };

  const createOrderWithLines = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    })
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(getOrderLine(1, 20));
      })
      .then((orderLine) => {
        testData.orderLine1 = orderLine;

        return OrderLines.createOrderLineViaApi(getOrderLine(2, 30));
      })
      .then((orderLine) => {
        testData.orderLine2 = orderLine;

        return OrderLines.createOrderLineViaApi(getOrderLine(3, 40));
      })
      .then((orderLine) => {
        testData.orderLine3 = orderLine;

        return Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
  };

  const refreshOrderLine = (orderLineKey) => {
    return OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id).then((orderLine) => {
      testData[orderLineKey] = orderLine;
    });
  };

  const refreshOrderLines = () => {
    return refreshOrderLine('orderLine1')
      .then(() => refreshOrderLine('orderLine2'))
      .then(() => refreshOrderLine('orderLine3'));
  };

  const setPaymentNotRequiredForThirdOrderLine = () => {
    return OrderLines.updateOrderLineViaApi({
      ...testData.orderLine3,
      paymentStatus: ORDER_LINE_PAYMENT_STATUSES_API.PAYMENT_NOT_REQUIRED,
    }).then(() => refreshOrderLine('orderLine3'));
  };

  const createInvoiceLine = (orderLineKey, subTotal) => {
    return Invoices.createInvoiceLineViaApi(
      Invoices.getDefaultInvoiceLine({
        invoiceId: testData.invoice.id,
        invoiceLineStatus: testData.invoice.status,
        poLineId: testData[orderLineKey].id,
        fundDistributions: testData[orderLineKey].fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal,
        releaseEncumbrance: false,
      }),
    );
  };

  const createReviewedInvoice = () => {
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
          subTotal: 20,
          releaseEncumbrance: true,
          exportToAccounting: true,
        });
      })
      .then((invoice) => {
        testData.invoice = invoice;

        return createInvoiceLine('orderLine2', 30);
      })
      .then(() => createInvoiceLine('orderLine3', 40))
      .then(() => {
        return Invoices.changeInvoiceStatusViaApi({
          invoice: testData.invoice,
          status: INVOICE_STATUSES.REVIEWED,
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
    return updateFiscalYearDates('first', -1)
      .then(() => updateFiscalYearDates('second', 0));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
        Permissions.uiInvoicesPayInvoices.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(true);
    OrderLinesLimit.setPOLLimitViaApi(3);

    createConsecutiveFiscalYears()
      .then(createLedger)
      .then(createFundWithBudget)
      .then(createOrganization)
      .then(getAcquisitionMethodId)
      .then(createOrderWithLines)
      .then(refreshOrderLines)
      .then(setPaymentNotRequiredForThirdOrderLine)
      .then(createReviewedInvoice)
      .then(rolloverToSecondFiscalYear)
      .then(shiftFiscalYearDates)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C700857 POL payment status is updated if "Awaiting payment" option was selected when approving and paying an invoice against a previous fiscal year (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C700857', 'nonParallel'] },
    () => {
      // Step 1: Navigate to POL #1 details pane
      Orders.selectFromResultsList(testData.order.poNumber);
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

      // Step 2: Navigate to invoice details pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.openInvoice(testData.invoice.id);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.REVIEWED },
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
        invoiceLines: [
          { poNumber: testData.orderLine1.poLineNumber },
          { poNumber: testData.orderLine2.poLineNumber },
          { poNumber: testData.orderLine3.poLineNumber },
        ],
      });

      // Step 3: Approve and pay invoice and verify Update order status modal
      InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled: true });
      UpdatePOLinePaymentStatusModal.verifyModalView();

      // Step 4: Click Cancel button
      UpdatePOLinePaymentStatusModal.selectPaymentStatus(
        INVOICE_POL_PAYMENT_STATUSES.PARTIALLY_PAID_UI,
      );
      UpdatePOLinePaymentStatusModal.closeModal();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.REVIEWED },
        ],
      });

      // Step 5: Select Awaiting payment option
      InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled: true });
      UpdatePOLinePaymentStatusModal.selectPaymentStatus(
        INVOICE_POL_PAYMENT_STATUSES.AWAITING_PAYMENT_UI,
      );
      UpdatePOLinePaymentStatusModal.clickSubmitButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 6: Click invoice line #1
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [{ key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.PAID }],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: '$0.00',
        },
      ]);

      // Step 7: Check encumbrance for the previous FY
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: `$${testData.orderLine1.cost.poLineEstimatedPrice}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });

      // Step 8: Click POL number hyperlink, check payment status and current encumbrance
      TransactionDetails.openSourceInTransactionDetails(testData.orderLine1.poLineNumber);
      OrderLineDetails.waitLoading();
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

      // Step 9: Navigate to encumbrance details pane for the second invoice line
      OrderLines.viewPO();
      OrderDetails.waitLoading();
      OrderDetails.openInvoice(testData.invoice.id);
      InvoiceView.waitLoading();
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: `$${testData.orderLine2.cost.poLineEstimatedPrice}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 10: Click POL number hyperlink, check payment status and current encumbrance
      TransactionDetails.openSourceInTransactionDetails(testData.orderLine2.poLineNumber);
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.PARTIALLY_PAID },
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

      // Step 11: Navigate to encumbrance details pane for the third invoice line
      OrderLines.viewPO();
      OrderDetails.waitLoading();
      OrderDetails.openInvoice(testData.invoice.id);
      InvoiceView.waitLoading();
      InvoiceView.selectInvoiceLine(2);
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: `$${testData.orderLine3.cost.poLineEstimatedPrice}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: `$${testData.orderLine3.cost.poLineEstimatedPrice}.00` },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 12: Click POL number hyperlink, check payment status and current encumbrance
      TransactionDetails.openSourceInTransactionDetails(testData.orderLine3.poLineNumber);
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
          conditions: { value: ORDER_LINE_PAYMENT_STATUS.PAYMENT_NOT_REQUIRED },
        },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          value: '100%',
          amount: `$${testData.orderLine3.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine3.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: `$${testData.orderLine3.cost.poLineEstimatedPrice}.00`,
        },
      ]);
    },
  );
});
