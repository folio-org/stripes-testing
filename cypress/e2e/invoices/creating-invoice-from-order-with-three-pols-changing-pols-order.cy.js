import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  InvoiceLineDetails,
  InvoiceView,
  Invoices,
  NewInvoice,
} from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    invoice: {
      ...NewInvoice.defaultUiInvoice,
      accountingCode: organization.erpCode,
      vendorName: organization.name,
    },
    orderLines: [],
  };
  const polLinePrice = 100;

  before('Create test data', () => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      testData.invoice.accountingCode = testData.organization.erpCode;
      testData.invoice.vendorName = testData.organization.name;
    });

    OrderLinesLimit.setPOLLimitViaApi(3);

    cy.getBatchGroups().then((batchGroup) => {
      testData.invoice.batchGroup = batchGroup.name;
    });

    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then((params) => {
      testData.acquisitionMethod = params.body.acquisitionMethods[0];

      testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
      testData.order.reEncumber = true;

      Orders.createOrderViaApi(testData.order).then((orderResponse) => {
        testData.order = orderResponse;

        for (let i = 0; i < 3; i++) {
          const orderLine = BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethod.id,
            purchaseOrderId: testData.order.id,
            listUnitPrice: polLinePrice,
            title: `autotest_POL_${i + 1}_${getRandomPostfix()}`,
          });
          testData.orderLines.push(orderLine);
        }

        cy.wrap(testData.orderLines).each((poLine) => {
          OrderLines.createOrderLineViaApi(poLine);
        });

        Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          OrderLines.getOrderLineViaApi({
            query: `purchaseOrderId=="${testData.order.id}"`,
          }).then((orderLines) => {
            testData.orderLines = orderLines;
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
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
      Invoices.getInvoiceViaApi({
        query: `vendorInvoiceNo="${testData.invoice.invoiceNumber}"`,
      }).then(({ invoices }) => {
        if (invoices?.length) {
          invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
        }
      });

      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C366532 Creating invoice from order with three POLs, changing POLs order (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C366532'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      Orders.newInvoiceFromOrder();

      Invoices.createInvoiceFromOrderWithEditSequence(testData.invoice);
      Invoices.checkEditSequenceOfInvoiceLinesPage(testData.invoice.invoiceNumber);

      Invoices.dragAndDropInvoiceLine(0, 2);

      Invoices.saveAndCloseEditSequencePage();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: 'Status', value: 'Open' },
          { key: 'Batch group', value: testData.invoice.batchGroup },
          { key: 'Total units', value: '3' },
          { key: 'Sub-total', value: '$300.00' },
          { key: 'Total adjustments', value: '$0.00' },
          { key: 'Calculated total amount', value: '$300.00' },
        ],
        vendorDetailsInformation: [
          { key: 'Vendor invoice number', value: testData.invoice.invoiceNumber },
          { key: 'Vendor name', value: testData.organization.name },
          { key: 'Accounting code', value: testData.organization.erpCode },
        ],
      });

      InvoiceView.checkInvoiceLinesTableContent([
        { description: testData.orderLines[1].titleOrPackage },
        { description: testData.orderLines[2].titleOrPackage },
        { description: testData.orderLines[0].titleOrPackage },
      ]);

      InvoiceView.selectInvoiceLine(0);

      InvoiceLineDetails.openPOLineFromInvoiceLine();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkRelatedInvoiceLinesTableContent([
        {
          vendorInvoiceNo: testData.invoice.invoiceNumber,
          invoiceLineNumber: '1',
          vendorCode: testData.organization.code,
        },
      ]);
    },
  );
});
