import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const orderLinesCount = 2;
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: { allocated: 100 },
      });

      testData.fund = fund;
      testData.budget = budget;

      OrderLinesLimit.setPOLLimit(orderLinesCount);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

        Orders.createOrderViaApi(testData.order).then((order) => {
          testData.order = order;

          cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
            const acquisitionMethod = body.acquisitionMethods[0].id;

            testData.orderLines = [
              BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod,
                purchaseOrderId: testData.order.id,
                listUnitPrice: 10,
                fundDistribution: [
                  { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                ],
              }),
              BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod,
                purchaseOrderId: testData.order.id,
              }),
            ];
            testData.orderLines.forEach((orderLine) => {
              OrderLines.createOrderLineViaApi(orderLine);
            });
          });

          Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCancelOrderLines.gui,
      Permissions.uiOrdersCancelPurchaseOrders.gui,
      Permissions.uiOrdersReopenPurchaseOrders.gui,
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
      OrderLinesLimit.setPOLLimit(1);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C366113 Order can be reopened when one PO line has a fund distribution and one PO line does not (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C366113'] },
    () => {
      // Search for order and click on it
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click "Actions" button, Select "Cancel" option, Click "Submit" button
      OrderDetails.closeOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);

      // Click "Actions" button, Select "Reopen" option
      OrderDetails.reOpenOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
