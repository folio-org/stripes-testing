import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';

let userData;
const testData = {
  organization: NewOrganization.getDefaultOrganization(),
  order: {},
  invoice: {},
};
const accordionsName = ['Purchase order', 'PO summary', 'PO lines', 'Related invoices'];
const message = "You don't have permission to view this app/record";
const btnOrders = 'Orders';
const btnOrderLines = 'Order lines';

describe('Permissions', () => {
  describe('Invoices', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      const { fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi();

      testData.fund = fund;
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        const order = {
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        };
        const orderLine = BasicOrderLine.getDefaultOrderLine({
          fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(order, orderLine).then((orderWithLine) => {
          testData.order = orderWithLine;

          Orders.updateOrderViaApi({ ...orderWithLine, workflowStatus: 'Open' });
        });

        Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
        }).then((invoice) => {
          testData.invoice = invoice;

          OrderLines.getOrderLineViaApi({
            query: `poLineNumber=="*${testData.order.poNumber}*"`,
          }).then((orderLines) => {
            const invoiceLine = Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              poLineId: orderLines[0].id,
              fundDistributions: orderLines[0].fundDistribution,
              accountingCode: testData.organization.erpCode,
            });
            Invoices.createInvoiceLineViaApi(invoiceLine);
          });
        });
      });
      cy.createTempUser([Permissions.uiOrdersView.gui]).then((userProperties) => {
        userData = userProperties;
        cy.login(userData.username, userData.password, {
          path: TopMenu.orderLinesPath,
          waiter: OrderLines.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C353617 - Negative: warning message appears when user without View invoices permission is trying to view invoice (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353617'] },
      () => {
        Orders.verifyActiveBtnOrdersFilters(btnOrderLines);

        Orders.selectOrdersPane();
        Orders.verifyActiveBtnOrdersFilters(btnOrders);

        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        accordionsName.forEach((name) => {
          OrderDetails.verifyAccordionExists(name);
        });

        OrderDetails.openInvoice(testData.invoice.id);
        InvoiceView.verifyWarningMessage(message);
      },
    );
  });
});
