import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_BATCH_GROUPS,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets } from '../../support/fragments/finance';
import { InvoiceEditForm, InvoiceLineDetails, InvoiceView } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

const orderCurrency = { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' };
const exchangeRate = 1.5;
const orderLinePrice = 10;

const inOrderCurrency = (amount) => `${orderCurrency.symbol}${amount.toFixed(2)}`;
const inDefaultCurrency = (amount) => `$${amount.toFixed(2)}`;

const encumberedAmount = inDefaultCurrency(orderLinePrice * exchangeRate);
const amountsInOrderCurrency = [
  { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: inOrderCurrency(orderLinePrice) },
  { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: inOrderCurrency(0) },
  { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: inOrderCurrency(orderLinePrice) },
];

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    fund: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroupName: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNo: `AT_C440073_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
      id: null,
    },
    user: {},
  };

  const createFinanceData = () => {
    const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const fetchAcquisitionMethod = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    })
      .then((orderResponse) => {
        testData.order = orderResponse;

        const orderLine = BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId: orderResponse.id,
          acquisitionMethod: testData.acquisitionMethod.id,
          listUnitPrice: orderLinePrice,
          poLineEstimatedPrice: orderLinePrice,
          fundDistribution: [
            {
              code: testData.fund.code,
              fundId: testData.fund.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
        });

        return OrderLines.createOrderLineViaApi({
          ...orderLine,
          cost: {
            ...orderLine.cost,
            currency: orderCurrency.code,
            exchangeRate,
          },
        });
      })
      .then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValueViaApi(false);
      createFinanceData();
      createOrganization()
        .then(fetchAcquisitionMethod)
        .then(createOrderWithOrderLine)
        .then(openOrder);
    });

    cy.createTempUser([
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C440073 Currency is populated in invoice with the value from the corresponding currency field on related order record with one PO line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C440073', 'nonParallel'] },
    () => {
      // Step 1: Navigate to Order details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Create an invoice based on the order
      OrderDetails.createNewInvoice();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkCurrencyCode(orderCurrency.code);
      InvoiceEditForm.verifyIsExchangeRateChecked(true);
      InvoiceEditForm.checkExchangeRate(exchangeRate);

      // Step 3: Fill all mandatory fields and save invoice
      InvoiceEditForm.fillInvoiceFields(testData.invoice);
      InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: amountsInOrderCurrency,
      });

      // Step 4: Expand "Extended information" accordion
      InvoiceView.expandExtendedInformationAccordion();
      InvoiceView.checkInvoiceDetails({
        extendedInformation: [
          { key: INVOICE_VIEW_FIELDS.CURRENCY, value: orderCurrency.name },
          { key: INVOICE_VIEW_FIELDS.EXCHANGE_RATE, value: String(exchangeRate) },
        ],
      });

      // Step 5: Open created invoice line
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL, value: inOrderCurrency(orderLinePrice) },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          amount: inOrderCurrency(orderLinePrice),
          initialEncumbrance: encumberedAmount,
          currentEncumbrance: encumberedAmount,
        },
      ]);

      // Step 6: Go back to invoice details pane
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      InvoiceView.waitLoading();

      // Step 7: Approve invoice
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
          ...amountsInOrderCurrency,
        ],
      });

      // Step 8: Pay invoice
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
          ...amountsInOrderCurrency,
        ],
      });
    },
  );
});
