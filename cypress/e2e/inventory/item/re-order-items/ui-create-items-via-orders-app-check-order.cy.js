import {
  ORDER_STATUSES,
  ORDER_FORMAT_NAMES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import { BasicOrderLine, NewOrder, Orders } from '../../../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const organization = NewOrganization.getDefaultOrganization();
      const testData = {
        instanceTitle: `AT_C808506_FolioInstance_${getRandomPostfix()}`,
        organization,
        servicePoint: ServicePoints.getDefaultServicePoint(),
        order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
        user: {},
        firstHoldingsItemOrders: [1, 2, 3],
        secondHoldingsItemOrders: [1],
      };

      before('Create test data', () => {
        cy.getAdminToken().then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('C808506_');
          Organizations.createOrganizationViaApi(testData.organization);

          ServicePoints.createViaApi(testData.servicePoint)
            .then(() => {
              testData.locations = [
                Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
                Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
              ];
              testData.locations.forEach((location) => Locations.createViaApi(location));
            })
            .then(() => {
              cy.getDefaultMaterialType()
                .then(({ id: materialTypeId }) => {
                  const baseOrderLine = BasicOrderLine.getDefaultOrderLine({
                    title: testData.instanceTitle,
                  });
                  testData.orderLine = {
                    ...baseOrderLine,
                    cost: {
                      ...baseOrderLine.cost,
                      listUnitPrice: 1,
                      quantityPhysical: 4,
                    },
                    orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE_Check,
                    checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
                    physical: {
                      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
                      materialType: materialTypeId,
                    },
                    locations: [
                      { locationId: testData.locations[0].id, quantityPhysical: 3 },
                      { locationId: testData.locations[1].id, quantityPhysical: 1 },
                    ],
                  };
                })
                .then(() => {
                  cy.createTempUser([
                    Permissions.uiInventoryViewInstances.gui,
                    Permissions.uiInventoryViewCreateEditItems.gui,
                    Permissions.uiOrdersCreate.gui,
                    Permissions.uiOrdersEdit.gui,
                  ]).then((userProperties) => {
                    testData.user = userProperties;
                  });
                })
                .then(() => {
                  cy.getToken(testData.user.username, testData.user.password);

                  Orders.createOrderWithOrderLineViaApi(
                    NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                    testData.orderLine,
                  ).then((createdOrder) => {
                    testData.order = createdOrder;

                    Orders.updateOrderViaApi({
                      ...createdOrder,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    });
                  });
                });
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
        Users.deleteViaApi(testData.user.userId);
        testData.locations.forEach((location) => {
          Locations.deleteViaApi(location);
        });
        ServicePoints.deleteViaApi(testData.servicePoint.id);
      });

      // May FAIL due to https://folio-org.atlassian.net/MODINV-1362
      it(
        'C808506 Create "Item" record via "Orders" app and check "order" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C808506'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          InventoryInstance.openHoldingsAccordion(testData.locations[0].name);
          testData.firstHoldingsItemOrders.forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              testData.locations[0].name,
              index,
              orderValue,
              false,
            );
          });

          InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
          testData.secondHoldingsItemOrders.forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              testData.locations[1].name,
              index,
              orderValue,
              false,
            );
          });

          InventoryInstance.getId().then((instanceId) => {
            cy.getHoldings({
              limit: 10,
              query: `"instanceId"=="${instanceId}"`,
            }).then((holdings) => {
              InventoryItems.getItemsInHoldingsViaApi(holdings[0].id).then((items) => {
                const orderValues = items.map((itm) => itm.order);
                expect(orderValues).to.deep.equal(testData.firstHoldingsItemOrders);
              });

              InventoryItems.getItemsInHoldingsViaApi(holdings[1].id).then((items) => {
                const orderValues = items.map((itm) => itm.order);
                expect(orderValues).to.deep.equal(testData.secondHoldingsItemOrders);
              });
            });
          });
        },
      );
    });
  });
});
