import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_LINE_SEARCH_INDEX_LABELS,
  ORDER_STATUSES,
} from '../../support/constants';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    acquisitionMethodId: null,
    order: {},
    orderLineFirst: {},
    orderLineSecond: {},
    invoice: {},
    invoiceLine: {
      description: `AT_C410742_description_${getRandomPostfix()}`,
      quantity: '1',
      subTotal: '10',
    },
    user: {},
  };

  const buttonConditions = {
    saveCloseDisabled: [
      { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
    ],
    saveCloseEnabled: [
      { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
      { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
    ],
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

  const createOrderLine = (orderLineKey) => {
    return OrderLines.createOrderLineViaApi(
      BasicOrderLine.getDefaultOrderLine({
        acquisitionMethod: testData.acquisitionMethodId,
        purchaseOrderId: testData.order.id,
        title: `AT_C410742_${orderLineKey}_${getRandomPostfix()}`,
        listUnitPrice: 10,
        poLineEstimatedPrice: 10,
      }),
    ).then((orderLine) => {
      testData[orderLineKey] = orderLine;
    });
  };

  const createOpenOrderWithTwoLines = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((orderResponse) => {
        testData.order = orderResponse;
      })
      .then(() => createOrderLine('orderLineFirst'))
      .then(() => createOrderLine('orderLineSecond'))
      .then(() => {
        return Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
  };

  const createInvoiceLineFromPoLine = (orderLine) => {
    return Invoices.createInvoiceLineViaApi(
      Invoices.getDefaultInvoiceLine({
        invoiceId: testData.invoice.id,
        invoiceLineStatus: INVOICE_STATUSES.OPEN,
        poLineId: orderLine.id,
        subTotal: 10,
      }),
    );
  };

  const createInvoiceFromOrder = () => {
    return Invoices.createInvoiceViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
    })
      .then((invoice) => {
        testData.invoice = invoice;
      })
      .then(() => createInvoiceLineFromPoLine(testData.orderLineFirst))
      .then(() => createInvoiceLineFromPoLine(testData.orderLineSecond));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.uiOrdersEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  };

  const addBlankInvoiceLine = () => {
    InvoiceView.openInvoiceLineEditForm();
    InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);
    InvoiceLineEditForm.fillInvoiceLineFields(testData.invoiceLine);
    InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);
    InvoiceLineEditForm.clickSaveButton();
    InvoiceView.waitLoading();
  };

  before('Create test data', () => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(3);

    createOrganization()
      .then(getAcquisitionMethodId)
      .then(createOpenOrderWithTwoLines)
      .then(createInvoiceFromOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C410742 Correct numbering when add, delete, and repeatedly add invoice line (created based on PO lines) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C410742', 'nonParallel'] },
    () => {
      // Step 1: Open invoice from Preconditions details pane
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [
          { number: 1, poNumber: testData.orderLineFirst.poLineNumber },
          { number: 2, poNumber: testData.orderLineSecond.poLineNumber },
        ],
      });

      // Step 2: Click on the second invoice line record in "Invoice lines" accordion
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: 2,
        invoiceLineInformation: [
          {
            key: INVOICE_LINE_VIEW_FIELDS.PO_LINE_NUMBER,
            value: testData.orderLineSecond.poLineNumber,
          },
        ],
      });

      // Steps 3-4: Click "Actions" => "Delete" on "View invoice line - 2" pane => confirm deletion
      InvoiceLineDetails.deleteInvoiceLine(2);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [{ number: 1, poNumber: testData.orderLineFirst.poLineNumber }],
      });

      // Steps 5-7: Add new blank invoice line, number "2" is not reused
      addBlankInvoiceLine();
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [
          { number: 1, poNumber: testData.orderLineFirst.poLineNumber },
          { number: 3, description: testData.invoiceLine.description },
        ],
      });

      // Step 8: Click "Actions" in "Invoice lines" accordion => select "Add line from POL" option
      const SelectOrderLinesModal = InvoiceView.openSelectOrderLineModal();

      // Step 9: Search for PO line related to deleted invoice line => check the checkbox next to it
      SelectOrderLinesModal.searchByParameter(
        ORDER_LINE_SEARCH_INDEX_LABELS.POL_NUMBER,
        testData.orderLineSecond.poLineNumber,
      );
      SelectOrderLinesModal.selectFromSearchResults();
      SelectOrderLinesModal.checkOrderLineSelected();

      // Step 10: Click "Save" button in "Select order lines" popup, number "2" is not reused
      SelectOrderLinesModal.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [
          { number: 1, poNumber: testData.orderLineFirst.poLineNumber },
          { number: 3, description: testData.invoiceLine.description },
          { number: 4, poNumber: testData.orderLineSecond.poLineNumber },
        ],
      });
    },
  );
});
