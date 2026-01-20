import { Permissions } from '../../support/dictionary';
import { NewOrder, Orders, BasicOrderLine } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });

    cy.stubBrowserPrompt();
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C353661 "Copy" icon is added to PO and POL number (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353661'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderLinesTableContent([
        { poLineNumber: testData.order.poNumber, poLineTitle: testData.orderLine.title },
      ]);

      // Check "Purchase order" accordion on the "Purchase order" pane
      OrderDetails.checkFieldsHasCopyIcon([{ label: 'PO number' }]);

      // Click on the "Copy" icon
      OrderDetails.copyOrderNumber(testData.order.poNumber);

      // Check clipboard text
      cy.checkBrowserPrompt({ callNumber: 0, promptValue: testData.order.poNumber });

      // Click on PO line in the "PO lines" tables
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Check "Purchase order line" accordion on the "PO Line details" pane
      OrderLineDetails.checkFieldsHasCopyIcon([{ label: 'POL number' }]);

      // Click on the "Copy" icon
      OrderLineDetails.copyOrderNumber(`${testData.order.poNumber}-1`);

      // Check clipboard text
      cy.checkBrowserPrompt({ callNumber: 1, promptValue: `${testData.order.poNumber}-1` });
    },
  );
});
