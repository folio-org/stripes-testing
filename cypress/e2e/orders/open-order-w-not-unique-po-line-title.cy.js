import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import OpenOrder from '../../support/fragments/settings/orders/openOrder';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const isApprovePayEnabled = true;
  const isDuplicateCheckDisabled = true;
  const orderLineTitle = `autotest_po_line_name-${getRandomPostfix()}`;
  const ordersCount = 2;
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    orders: [],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValue(isApprovePayEnabled);
      OpenOrder.setDuplicateCheckValue(isDuplicateCheckDisabled);

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        [...Array(ordersCount)].forEach(() => {
          const order = NewOrder.getDefaultOrder({ vendorId: organization.id });
          const orderLine = BasicOrderLine.getDefaultOrderLine({
            title: orderLineTitle,
          });

          Orders.createOrderWithOrderLineViaApi(order, orderLine).then((response) => {
            testData.orders.push(response);

            Orders.updateOrderViaApi({ ...response, approved: true });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValue(false);
    OpenOrder.setDuplicateCheckValue(false);
    testData.orders.forEach((order) => Orders.deleteOrderViaApi(order.id));
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C353562 User is able to open purchase order with NOT unique PO line title when "Disable duplicate check" option is enabled (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353562'] },
    () => {
      // Search for the Order #1 from Preconditions and click on its record
      const OrderDetails = Orders.selectOrderByPONumber(testData.orders[0].poNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: 'Workflow status', value: ORDER_STATUSES.PENDING },
          { key: 'Approved', value: { checked: true, disabled: true }, checkbox: true },
        ],
      });

      // Click on "Actions" button, Select "Open" option
      // Click "Submit" button in "Open - purchase order" popup
      OrderDetails.openOrder({ orderNumber: testData.orders[0].poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
