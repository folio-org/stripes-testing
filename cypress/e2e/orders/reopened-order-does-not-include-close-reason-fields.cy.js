import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
  NO_VALUE,
  REQUEST_METHOD,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import OrderStates from '../../support/fragments/orders/orderStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

const R = {
  ORGANIZATION: 'organization',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  USER: 'user',
};

const TEST_VALUES = {
  VENDOR_NAME: 'AT_C1332440_Vendor',
  VENDOR_CODE: 'AT_C1332440',
  POL_TITLE: 'AT_C1332440_POL',
};

describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  const postfix = getRandomPostfix();

  const waitForFilters = (trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
    phase: PANE_REQUEST_PHASES.FILTERS,
    trigger,
  });

  const waitForResults = (trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
    trigger,
  });

  before('Create C1332440 preconditions', () => {
    cy.getAdminToken();

    flow
      // Precondition 1: Create an order in Open status with one purchase order line.
      .step((f) => NewOrganization.createViaApi({
        ...NewOrganization.getDefaultOrganization(),
        name: `${TEST_VALUES.VENDOR_NAME}_${postfix}`,
        code: `${TEST_VALUES.VENDOR_CODE}_${postfix}`,
      }).then((organization) => f.set(R.ORGANIZATION, organization, () => Organizations.deleteOrganizationViaApi(organization.id))))
      .step((f) => Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({
          vendorId: f.get(R.ORGANIZATION).id,
          orderType: ORDER_TYPES.ONE_TIME_API,
        }),
      ).then((order) => f.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false))))
      .step((f) => cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
        })
        .then(({ body }) => OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: body.acquisitionMethods[0].id,
            purchaseOrderId: f.get(R.ORDER).id,
            title: `${TEST_VALUES.POL_TITLE}_${postfix}`,
          }),
        ).then((orderLine) => f.set(R.ORDER_LINE, orderLine, () => OrderLines.deleteOrderLineViaApi(orderLine.id, false)))))
      .step((f) => Orders.updateOrderViaApi({
        ...f.get(R.ORDER),
        workflowStatus: ORDER_STATUSES.OPEN,
      }))
      // Precondition 2: Close the opened order with Cancelled reason and no notes.
      .step((f) => Orders.updateOrderViaApi({
        ...f.get(R.ORDER),
        closeReason: {
          reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
          note: '',
        },
        workflowStatus: ORDER_STATUSES.CLOSED,
      }))
      // Precondition 3: Grant only Orders edit and Orders reopen permissions.
      .step((f) => cy
        .createTempUser([
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersReopenPurchaseOrders.gui,
        ])
        .then((user) => f.set(R.USER, user, () => Users.deleteViaApi(user.userId))))
      // Precondition 4: Open Orders with the closed order in the search results.
      .step((f) => waitForFilters(() => cy.login(f.get(R.USER).username, f.get(R.USER).password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      })).then(() => waitForResults(() => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, f.get(R.ORDER).poNumber))));
  });

  after('Delete C1332440 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1332440 Reopened order does not include closeReason fields',
    { tags: ['extendedPath', 'thunderjet', 'C1332440'] },
    () => {
      const { order } = flow.ctx();

      cy.log('Step 1. Open the closed order and verify closure details');
      Orders.selectFromResultsList(order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.verifyOrderTitle(OrderStates.purchaseOrderPaneTitle(order.poNumber));
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkFieldsConditions([
        {
          label: ORDER_VIEW_FIELD_LABELS.REASON_FOR_CLOSURE,
          conditions: { value: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
        },
        {
          label: ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE,
          conditions: { value: NO_VALUE },
        },
      ]);

      cy.log('Step 2. Reopen the order and verify closeReason is omitted');
      cy.intercept(REQUEST_METHOD.PUT, `**/orders/composite-orders/${order.id}*`).as('reopenOrder');
      cy.intercept(REQUEST_METHOD.GET, `**/orders/composite-orders/${order.id}*`).as(
        'getReopenedOrder',
      );
      OrderDetails.reOpenOrder({ orderNumber: order.poNumber });
      cy.wait('@reopenOrder').then(({ request, response }) => {
        expect(request.body).not.to.have.property('closeReason');
        expect(response.body).not.to.have.property('closeReason');
      });
      cy.wait('@getReopenedOrder').its('response.body').should('not.have.property', 'closeReason');
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails({
        fieldsNotDisplayed: [
          ORDER_VIEW_FIELD_LABELS.REASON_FOR_CLOSURE,
          ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE,
        ],
      });
    },
  );
});
