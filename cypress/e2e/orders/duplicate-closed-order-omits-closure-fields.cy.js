import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_LINE_RESULTS_LIST_COLUMNS,
  ORDER_SEARCH_OPTIONS,
  ORDER_TYPES,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  REQUEST_METHOD,
} from '../../support/constants';
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
import Permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';
import { getFullName } from '../../support/utils/acquisitions';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

const R = {
  ORGANIZATION: 'organization',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  DUPLICATED_ORDER: 'duplicatedOrder',
  USER: 'user',
};

const ORDER_DETAIL_FIELDS = {
  OPENED_BY: 'Opened by',
};

const TEST_VALUES = {
  CLOSURE_NOTE: `AT_C1332439_ClosureNote_${getRandomPostfix()}`,
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

  before('Create C1332439 preconditions', () => {
    cy.getAdminToken();

    flow
      // Precondition 1: An order in Open status with one PO line exists.
      .step((f) => {
        return NewOrganization.createViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_C1332439_Vendor_${postfix}`,
          code: `AT_C1332439_${postfix}`,
        }).then((organization) => f.set(R.ORGANIZATION, organization, () => Organizations.deleteOrganizationViaApi(organization.id)));
      })
      .step((f) => {
        return Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({
            vendorId: f.get(R.ORGANIZATION).id,
            orderType: ORDER_TYPES.ONE_TIME_API,
          }),
        ).then((order) => f.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false)));
      })
      .step((f) => {
        return cy
          .getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
          })
          .then(({ body }) => {
            const orderLine = BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: body.acquisitionMethods[0].id,
              purchaseOrderId: f.get(R.ORDER).id,
              title: `AT_C1332439_POL_${postfix}`,
            });

            return OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => f.set(R.ORDER_LINE, createdOrderLine, () => OrderLines.deleteOrderLineViaApi(createdOrderLine.id, false)));
          });
      })
      .step((f) => {
        return Orders.updateOrderViaApi({
          ...f.get(R.ORDER),
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      // Precondition 2: The opened order is cancelled with a populated Notes field.
      .step((f) => {
        return Orders.updateOrderViaApi({
          ...f.get(R.ORDER),
          closeReason: {
            note: TEST_VALUES.CLOSURE_NOTE,
            reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
          },
          workflowStatus: ORDER_STATUSES.CLOSED,
        });
      })
      // Precondition 3: The authorized user has Orders: edit and Orders: create capabilities.
      .step((f) => {
        return cy
          .createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui])
          .then((user) => f.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
      })
      // Precondition 4: The user is in Orders with the closed order in the search results.
      .step((f) => {
        return waitForFilters(() => cy.login(f.get(R.USER).username, f.get(R.USER).password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        })).then(() => waitForResults(() => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, f.get(R.ORDER).poNumber)));
      });
  });

  after('Delete C1332439 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1332439 Duplicated closed order omits closure and opened-by fields',
    { tags: ['extendedPath', 'thunderjet', 'C1332439'] },
    () => {
      const { order, orderLine, organization, user } = flow.ctx();

      cy.log('Step 1. Open the closed order and verify closure details');
      Orders.selectFromResultsList(order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.verifyOrderTitle(OrderStates.purchaseOrderPaneTitle(order.poNumber));
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          {
            key: ORDER_VIEW_FIELD_LABELS.REASON_FOR_CLOSURE,
            value: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
          },
          { key: ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE, value: TEST_VALUES.CLOSURE_NOTE },
        ],
      });

      cy.log('Step 2. Duplicate the closed order and verify omitted closure fields');
      cy.intercept(REQUEST_METHOD.POST, '**/orders/composite-orders').as('duplicateOrder');
      Orders.duplicateOrder({ verifyModal: true });
      cy.wait('@duplicateOrder').then(({ request, response }) => {
        expect(request.body).not.to.have.property('closeReason');
        expect(request.body).not.to.have.property('openedById');
        expect(response.body).not.to.have.property('closeReason');
        expect(response.body).not.to.have.property('openedById');

        flow.set(R.DUPLICATED_ORDER, response.body, () => Orders.deleteOrderViaApi(response.body.id, false));
      });
      InteractorsTools.checkCalloutMessage(OrderStates.orderDuplicatedSuccessfully);
      OrderDetails.waitLoading();

      flow.step((stepFlow) => {
        OrderDetails.verifyOrderTitle(
          OrderStates.purchaseOrderPaneTitle(stepFlow.get(R.DUPLICATED_ORDER).poNumber),
        );
        OrderDetails.verifyPOLCount(1);
        OrderDetails.checkOrderLineInTableByIdentifier(orderLine.titleOrPackage, [
          {
            columnName: ORDER_LINE_RESULTS_LIST_COLUMNS.TITLE_OR_PACKAGE,
            value: orderLine.titleOrPackage,
          },
        ]);
        OrderDetails.checkOrderDetails({
          orderInformation: [
            { key: ORDER_VIEW_FIELD_LABELS.VENDOR, value: organization.name },
            { key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONE_TIME },
          ],
          fieldsNotDisplayed: [
            ORDER_VIEW_FIELD_LABELS.REASON_FOR_CLOSURE,
            ORDER_VIEW_FIELD_LABELS.NOTES_ON_CLOSURE,
            ORDER_DETAIL_FIELDS.OPENED_BY,
          ],
        });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      });

      cy.log('Step 3. Open the duplicated order and verify the opened-by field');
      flow.step((stepFlow) => {
        OrderDetails.openOrder({ orderNumber: stepFlow.get(R.DUPLICATED_ORDER).poNumber });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
        OrderDetails.checkFieldsConditions([
          {
            label: ORDER_DETAIL_FIELDS.OPENED_BY,
            conditions: { value: getFullName(user) },
          },
        ]);
      });
    },
  );
});
