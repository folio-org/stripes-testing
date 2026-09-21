import {
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { BasicOrderLine, NewOrder, OrderDetails, Orders } from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { Locations } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const orderDuplicatedMessage = 'The purchase order was successfully duplicated';
  let testData;

  before('Create test data', () => {
    const randomPostfix = getRandomPostfix();
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C436936_Vendor_${randomPostfix}`,
      },
      polTitle: `AT_C436936_PolTitle_${randomPostfix}`,
      duplicatedOrder: {},
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization);

      Locations.getViaApiAnyDefault()
        .then((locations) => {
          [testData.location] = locations;
        })
        .then(() => {
          cy.getDefaultMaterialType().then(({ id: materialTypeId }) => {
            // Precondition #1-3: P/E mix PO line with Synchronized workflow and the same location
            // for physical and electronic resources (two separate lines)
            testData.orderLine = {
              ...BasicOrderLine.getDefaultOrderLine(),
              titleOrPackage: testData.polTitle,
              cost: {
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                quantityElectronic: 1,
                listUnitPriceElectronic: 10,
                listUnitPrice: 10,
              },
              orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
              eresource: {
                createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
                accessProvider: testData.organization.id,
              },
              physical: {
                createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
                materialType: materialTypeId,
              },
              locations: [
                {
                  locationId: testData.location.id,
                  quantityPhysical: 1,
                  quantityElectronic: 0,
                },
                {
                  locationId: testData.location.id,
                  quantityPhysical: 0,
                  quantityElectronic: 1,
                },
              ],
            };

            Orders.createOrderWithOrderLineViaApi(
              NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              testData.orderLine,
            ).then((order) => {
              testData.order = order;

              // Order should be in "Open" status
              Orders.updateOrderViaApi({
                ...testData.order,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
            });
          });
        });
    });

    // Precondition #5: Authorized user with required permissions
    cy.createTempUser([
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersCreate.gui,
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
    cy.getAdminToken(false).then(() => {
      if (testData.duplicatedOrder.id) {
        Orders.deleteOrderViaApi(testData.duplicatedOrder.id, false);
      }
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.polTitle);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C436936 Open duplicated open P/E mix order with same location both for physical and electronic resources (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C436936'] },
    () => {
      // Step 1: Duplicate order from Preconditions #1
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      Orders.duplicateOrder({ verifyModal: true });
      InteractorsTools.checkCalloutMessage(orderDuplicatedMessage);
      OrderDetails.waitLoading();

      cy.getAdminToken(false).then(() => {
        Orders.getOrdersApi({ query: `vendor==${testData.organization.id}` }).then((orders) => {
          testData.duplicatedOrder = orders.find(({ id }) => id !== testData.order.id);
        });
      });
      cy.getUserToken(testData.user.username, testData.user.password);

      cy.then(() => {
        OrderDetails.verifyOrderTitle(`Purchase order - ${testData.duplicatedOrder.poNumber}`);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Step 2: Open duplicated order => "Actions" => "Open" => "Submit"
        OrderDetails.openOrder({ orderNumber: testData.duplicatedOrder.poNumber });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      });
    },
  );
});
