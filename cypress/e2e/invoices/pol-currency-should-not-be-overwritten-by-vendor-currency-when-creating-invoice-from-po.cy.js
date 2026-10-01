import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { InvoiceEditForm, Invoices, InvoiceView } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

const vendorCurrency = 'CAD';
const polCurrency = 'UAH';
const exchangeRate = 1.5;

describe('Invoices', () => {
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      vendorCurrencies: [vendorCurrency],
    },
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroupName: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNo: `AT_C451593_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
      id: null,
    },
    user: {},
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
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((orderResponse) => {
        testData.order = orderResponse;

        const orderLine = BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId: orderResponse.id,
          acquisitionMethod: testData.acquisitionMethod.id,
          listUnitPrice: 10,
          poLineEstimatedPrice: 10,
        });

        return OrderLines.createOrderLineViaApi({
          ...orderLine,
          cost: {
            ...orderLine.cost,
            currency: polCurrency,
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
      createOrganization()
        .then(fetchAcquisitionMethod)
        .then(createOrderWithOrderLine)
        .then(openOrder);
    });

    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
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
      if (testData.invoice.id) {
        Invoices.deleteInvoiceViaApi(testData.invoice.id);
      }
      OrderLines.deleteOrderLineViaApi(testData.orderLine.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C451593 POL currency should NOT be overwritten by Vendor currency when creating invoice from PO (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C451593'] },
    () => {
      // Step 1: Create invoice based on Order from Preconditions
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.createNewInvoice();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkCurrencyCode(polCurrency);
      InvoiceEditForm.checkExchangeRate(testData.orderLine.cost.exchangeRate);
      InvoiceEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      ]);

      // Step 2: Fill all mandatory fields and save invoice
      InvoiceEditForm.fillInvoiceFields(testData.invoice);
      InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });
      InvoiceView.waitLoading();

      cy.url().then((url) => {
        testData.invoice.id = url.match(/invoice\/view\/([^/]+)/)?.[1] || null;
      });

      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          {
            key: INVOICE_VIEW_FIELDS.SUB_TOTAL,
            value: `${polCurrency} ${testData.orderLine.cost.poLineEstimatedPrice.toFixed(2)}`,
          },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: `${polCurrency} 0.00` },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT,
            value: `${polCurrency} ${testData.orderLine.cost.poLineEstimatedPrice.toFixed(2)}`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
            value: `$${(testData.orderLine.cost.poLineEstimatedPrice * exchangeRate).toFixed(2)}`,
          },
        ],
      });
    },
  );
});
