import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      organization,
      order: {
        ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
        orderType: 'One-Time',
        approved: true,
      },
      orderLine: {},
      user: {},
      barcodeForFirstItem: uuid(),
      barcodeForSecondItem: uuid(),
    };

    before(() => {
      cy.getAdminToken();
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResponse) => {
          testData.location = locationResponse;

          cy.getBookMaterialType().then((mtypeResponse) => {
            testData.materialTypeId = mtypeResponse.id;

            Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
              organization.id = organizationsResponse;

              InventoryInstance.createInstanceViaApi().then((instanceData) => {
                testData.instanceId = instanceData.instanceData.instanceId;
                testData.instanceTitle = instanceData.instanceData.instanceTitle;

                testData.orderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  instanceId: testData.instanceId,
                  cost: {
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 2,
                    quantityElectronic: 2,
                    listUnitPriceElectronic: 10,
                    listUnitPrice: 10,
                  },
                  eresource: {
                    createInventory: 'Instance, Holding',
                    // accessProvider: 'd0fb5aa0-cdf1-11e8-a8d5-f2801f1b9fd1',
                  },
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: testData.materialTypeId,
                  },
                  orderFormat: 'P/E Mix',
                  locations: [
                    {
                      locationId: testData.location.id,
                      quantityPhysical: 2,
                      quantityElectronic: 2,
                    },
                  ],
                };

                Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
                  (order) => {
                    testData.order = order;

                    Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
                  },
                );
              });
            });
          });
        },
      );

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C738 Receiving pieces from an order for P/E MIx that is set to create Items in inventory (items for receiving includes "Order closed" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C738'] },
      () => {
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        Orders.receiveOrderViaActions();
        Receiving.selectLinkFromResultsList();
        Receiving.receiveFromExpectedSection();
        Receiving.receiveAllPhysicalItemsWithBarcodes(
          testData.barcodeForFirstItem,
          testData.barcodeForSecondItem,
        );
        Receiving.clickOnInstance();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.openItemByBarcodeAndIndex(testData.barcodeForFirstItem);
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.openItemByBarcodeAndIndex(testData.barcodeForSecondItem);
        ItemRecordView.checkItemDetails(
          testData.location.name,
          testData.barcodeForSecondItem,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
      },
    );
  });
});
