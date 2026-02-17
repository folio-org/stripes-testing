import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { NewOrder, Orders, BasicOrderLine, OrderLines } from '../../support/fragments/orders';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { INVOICE_STATUSES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 100 },
      });
      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 98,
          fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open', approved: true });

          OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
            (orderLines) => {
              testData.orderLine = orderLines[0];

              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: testData.orderLine.id,
                fundDistributions: testData.orderLine.fundDistribution,
                accountingCode: testData.organization.erpCode,
                releaseEncumbrance: true,
              }).then((invoice) => {
                testData.invoice = invoice;
              });
            },
          );
        });
      });
    });

    cy.createTempUser([Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      },
    );

    cy.stubBrowserPrompt();
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C353944 "Copy" icon is added to invoice number (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353944'] },
    () => {
      // Search for Invoice number from precondition
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);

      // Click on the Invoice number from precondition
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
        vendorDetails: [{ key: 'Vendor invoice number', value: testData.invoice.vendorInvoiceNo }],
      });

      // Check "Vendor invoice number" has "Copy" icon
      InvoiceView.checkFieldsHasCopyIcon([{ label: 'Vendor invoice number' }]);

      // Click on the "Copy" icon
      InvoiceView.copyOrderNumber(testData.invoice.vendorInvoiceNo);

      // Check clipboard text
      cy.checkBrowserPrompt({ callNumber: 0, promptValue: testData.invoice.vendorInvoiceNo });
    },
  );
});
