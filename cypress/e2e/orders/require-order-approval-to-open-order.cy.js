import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import orderDetails from '../../support/fragments/orders/orderDetails';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import interactorsTools from '../../support/utils/interactorsTools';
import InventoryInteractionsDefaults from '../../support/fragments/settings/orders/inventoryInteractionsDefaults';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
        query: '(module==ORDERS and configName==approvals)',
      })
        .then((body) => {
          if (body.configs.length !== 0) {
            const id = body.configs[0].id;

            InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
              id,
              module: 'ORDERS',
              configName: 'approvals',
              enabled: true,
              value: '{"isApprovalRequired": true}',
            });
          } else {
            InventoryInteractionsDefaults.createApprovalSettingViaApi({
              module: 'ORDERS',
              configName: 'approvals',
              value: '{"isApprovalRequired": true}',
            });
          }
        })
        .then(() => {
          Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
            testData.organization.id = organizationId;
            const order = NewOrder.getDefaultOrder({ vendorId: organizationId });
            order.approved = false;
            const orderLine = BasicOrderLine.getDefaultOrderLine();
            Orders.createOrderWithOrderLineViaApi(order, orderLine).then((response) => {
              testData.order = response;
            });
          });
        });
    });

    cy.createTempUser([
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersEdit.gui,
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
      InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
        query: '(module==ORDERS and configName==approvals)',
      }).then((body) => {
        if (body.configs.length !== 0) {
          const id = body.configs[0].id;

          InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
            id,
            module: 'ORDERS',
            configName: 'approvals',
            enabled: true,
            value: '{"isApprovalRequired": false}',
          });
        }
      });
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C6533 Require order approval to "open" order (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C6533'] },
    () => {
      Orders.selectOrderByPONumber(testData.order.poNumber);
      orderDetails.checkOrderDetails({
        summary: [
          { key: 'Workflow status', value: ORDER_STATUSES.PENDING },
          { key: 'Approved', value: { checked: false, disabled: true }, checkbox: true },
        ],
      });
      Orders.approveOrderbyActions();
      interactorsTools.checkCalloutMessage(
        `The Purchase order - ${testData.order.poNumber} was successfully approved`,
      );
      orderDetails.checkOrderDetails({
        summary: [
          { key: 'Workflow status', value: ORDER_STATUSES.PENDING },
          { key: 'Approved', value: { checked: true, disabled: true }, checkbox: true },
        ],
      });
      Orders.openOrder();
      interactorsTools.checkCalloutMessage(
        `The Purchase order - ${testData.order.poNumber} has been successfully opened`,
      );
    },
  );
});
