import { Permissions } from '../../support/dictionary';
import { InvoiceView, Invoices, NewInvoice } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BatchGroups } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    invoice: {
      ...NewInvoice.defaultUiInvoice,
      accountingCode: organization.erpCode,
      vendorName: organization.name,
      invoiceLineNumber:
        '<a\\shref=\\"\\/invoice\\/view(?:\\S+)\\/line\\/(?:\\S+)\\/view\\">2<\\/a>',
    },
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;
        });

        BatchGroups.createBatchGroupViaApi(testData.batchGroup).then((batchGroup) => {
          testData.invoice.batchGroup = batchGroup.name;
        });
      });
    });

    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Invoices.getInvoiceViaApi({
        query: `vendorInvoiceNo="${testData.invoice.invoiceNumber}"`,
      }).then(({ invoices }) => {
        invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
      });
      Orders.deleteOrderViaApi(testData.order.id);
      BatchGroups.deleteBatchGroupViaApi(testData.batchGroup.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C350949 Remove "Folio invoice number" from display in invoice line column (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350949'] },
    () => {
      // Click "Actions" button, Select "New" option
      // Fill in required fields with valid data and click "Save & close" button
      Invoices.createSpecialInvoice(testData.invoice);

      // Click "Actions" button, Select "Add line from POL" option
      Invoices.createInvoiceLineFromPol(testData.order.poNumber);

      // Add one more Invoice line to Invoice based on same PO line
      Invoices.createInvoiceLineFromPol(testData.order.poNumber);

      // Click on the first invoice line record
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkRelatedInvoiceLinesTableContent([
        {
          invoiceNumber: testData.invoice.invoiceNumber,
          invoiceLineNumber: testData.invoice.invoiceLineNumber,
          vendorCode: testData.organization.code,
        },
      ]);
    },
  );
});
