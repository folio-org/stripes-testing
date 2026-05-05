import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  CURRENCIES,
  INVOICE_VIEW_FIELDS,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

describe('Invoices', () => {
  const testData = {
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    },
    invoice: {},
    order: {},
    orderLine: {},
    user: {},
    updatedExchangeRate: '4',
  };

  before('Create test data', () => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization)
      .then((organizationId) => {
        testData.organization.id = organizationId;

        return cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        });
      })
      .then((acquisitionMethod) => {
        const order = {
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          orderType: ORDER_TYPES.ONE_TIME_API,
          reEncumber: true,
        };

        return Orders.createOrderViaApi(order).then((orderResponse) => {
          testData.order = orderResponse;

          const orderLine = {
            ...BasicOrderLine.defaultOrderLine,
            purchaseOrderId: orderResponse.id,
            cost: {
              listUnitPrice: 20,
              currency: 'USD',
              quantityPhysical: 1,
              poLineEstimatedPrice: 20,
            },
            locations: [],
            acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0].id,
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
              materialSupplier: testData.organization.id,
            },
          };

          return OrderLines.createOrderLineViaApi(orderLine);
        });
      })
      .then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => cy.getBatchGroups())
      .then(({ id: batchGroupId }) => {
        return Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          batchGroupId,
          accountingCode: testData.organization.erpCode,
          invoiceStatus: INVOICE_STATUSES.OPEN,
        });
      })
      .then((invoice) => {
        invoice.currency = 'UZS';
        invoice.exchangeRate = 3;
        return Invoices.updateInvoiceViaApi(invoice).then(() => {
          testData.invoice = invoice;
        });
      })
      .then(() => cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]))
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C436958 "Calculated total amount (Exchanged)" field is updated correctly when user adds invoice line from POL to invoice in different currency (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436958'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        fieldsNotDisplayed: [INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED],
      });
      Invoices.createInvoiceLineFromPol(testData.order.poNumber);
      Invoices.handleDifferentCurrencyModal();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          {
            key: INVOICE_VIEW_FIELDS.SUB_TOTAL,
            value: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT,
            value: `UZS ${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.invoice.exchangeRate}.00`,
          },
        ],
        invoiceLines: [
          {
            description: testData.orderLine.description,
            poNumber: testData.order.poNumber,
          },
        ],
      });
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkCurrency(CURRENCIES.UZS);
      InvoiceEditForm.checkFieldsConditions([
        {
          label: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
          conditions: {
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.invoice.exchangeRate}.00`,
          },
        },
      ]);
      InvoiceEditForm.fillInvoiceFields({
        exchangeRate: testData.updatedExchangeRate,
      });
      InvoiceEditForm.checkFieldsConditions([
        {
          label: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
          conditions: {
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.updatedExchangeRate}.00`,
          },
        },
      ]);
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice * testData.updatedExchangeRate}.00`,
          },
        ],
      });
    },
  );
});
