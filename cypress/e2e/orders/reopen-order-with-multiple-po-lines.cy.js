import { Permissions } from '../../support/dictionary';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import { Budgets, FiscalYears, Ledgers, Funds } from '../../support/fragments/finance';
import { NewOrder, Orders, BasicOrderLine, OrderLines } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ORDER_STATUSES } from '../../support/constants';
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
      const fiscalYear = FiscalYears.getDefaultFiscalYear();
      const ledger = {
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: fiscalYear.id,
      };
      const funds = {
        a: {
          ...Funds.getDefaultFund(),
          name: `autotest_fund_00A.${new Date().getTime()}`,
          ledgerId: ledger.id,
        },
        b: {
          ...Funds.getDefaultFund(),
          name: `autotest_fund_00B.${new Date().getTime()}`,
          ledgerId: ledger.id,
        },
      };

      FiscalYears.createViaApi(fiscalYear);
      Ledgers.createViaApi(ledger);
      Object.values(funds).forEach((fund) => {
        Funds.createViaApi(fund);

        const budget = {
          ...Budgets.getDefaultBudget(),
          allocated: 100,
          fiscalYearId: fiscalYear.id,
          fundId: fund.id,
        };
        Budgets.createViaApi(budget);
      });

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
                fundDistribution: [{ code: funds.a.code, fundId: funds.a.id, value: 100 }],
              }),
              BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod,
                purchaseOrderId: testData.order.id,
                listUnitPrice: 20,
                fundDistribution: [{ code: funds.b.code, fundId: funds.b.id, value: 100 }],
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
    'C366114 Order can be reopened when PO lines have different fund distributions (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C366114'] },
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
