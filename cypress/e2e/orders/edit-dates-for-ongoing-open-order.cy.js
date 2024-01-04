import moment from 'moment';

import { Permissions } from '../../support/dictionary';
import { ORDER_STATUSES, ORDER_TYPES } from '../../support/constants';
import { NewOrder, Orders, BasicOrderLine } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const date = moment();
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    date.set('day', date.day() + 1);
    testData.tomorrow = date.utc().format('MM/DD/YYYY');

    date.set('day', date.day() + 2);
    testData.dayAfterTomorrow = date.utc().format('MM/DD/YYYY');

    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: { isSubscription: true },
        });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...testData.order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C418593 Adding and editing "subscription to" date for ongoing open order (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: 'Order type', value: ORDER_TYPES.ONGOING }],
        ongoingInformation: [
          { key: 'Subscription', value: { checked: true, disabled: true }, checkbox: true },
        ],
        summary: [{ key: 'Workflow status', value: ORDER_STATUSES.OPEN }],
      });

      // One record with PO line from Precondition #2 is displayed in "PO lines" accordion
      OrderDetails.checkOrderLinesTableContent([
        { poLineNumber: testData.order.poNumber, poLineTitle: testData.orderLine.title },
      ]);

      // Click on PO line on "Purchase order" pane
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkOrderLineDetails({
        itemDetails: [{ key: 'Subscription to', value: 'No value set-' }],
      });

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'subscriptionTo', conditions: { value: '' } },
      ]);

      // Populate "Subscription to" field in "Item details" accordion with any future date
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { subscriptionTo: testData.tomorrow },
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'subscriptionTo', conditions: { value: testData.tomorrow } },
      ]);

      // Click on "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        itemDetails: [{ key: 'Subscription to', value: testData.tomorrow }],
      });

      // Click "Actions" button, Select "Edit" option
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'subscriptionTo', conditions: { value: testData.tomorrow } },
      ]);

      // Edit "Subscription to" field in "Item details" accordion - choose any other date in future
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { subscriptionTo: testData.dayAfterTomorrow },
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'subscriptionTo', conditions: { value: testData.dayAfterTomorrow } },
      ]);

      // Click on "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        itemDetails: [{ key: 'Subscription to', value: testData.dayAfterTomorrow }],
      });
    },
  );
});
