import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const barcodeForFirstItem = Helper.getRandomBarcode();
    const barcodeForSecondItem = Helper.getRandomBarcode();

    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      servicePoint: ServicePoints.defaultServicePoint,
      instance: {},
      locations: [],
      orderNumber: '',
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.instance = {
              ...instanceData,
              quantity: '2',
              vendorAccount: testData.organization.accounts[0].accountNo,
              listUnitPrice: '10',
              poLineEstimatedPrice: '20',
              eresource: null,
            };
            Organizations.createOrganizationViaApi(testData.organization);
          });
        })
        .then(() => {
          ServicePoints.createViaApi(testData.servicePoint).then(() => {
            Locations.createViaApi(
              Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
            ).then((location) => {
              testData.locations.push(location);

              // create the first PO with POL
              Orders.createOrderWithOrderLineViaApi(
                NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                BasicOrderLine.getDefaultOrderLine({
                  quantity: testData.instance.quantity,
                  title: testData.instance.instanceTitle,
                  instanceId: testData.instance.instanceId,
                  specialLocationId: testData.locations[0].id,
                  listUnitPrice: testData.instance.listUnitPrice,
                  poLineEstimatedPrice: testData.instance.poLineEstimatedPrice,
                  eresource: testData.instance.eresource,
                  vendorAccount: testData.instance.vendorAccount,
                }),
              ).then((order) => {
                testData.orderNumber = order.poNumber;

                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instance.instanceId,
                    permanentLocationId: location.id,
                    sourceId: folioSource.id,
                  }).then(({ id: holdingId }) => {
                    testData.instance.holdingId = holdingId;
                  });
                });
              });

              Locations.createViaApi(
                Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
              ).then((secondLocation) => {
                testData.locations.push(secondLocation);
              });
            });
          });
        });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderByOrderNumberViaApi(testData.orderNumber);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C375238 Create new holdings for already existing location when editing an order line (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C375238'] },
      () => {
        Orders.selectOrderByPONumber(testData.orderNumber);
        OrderLines.selectPOLInOrder(0);
        OrderLines.editPOLInOrder();
        OrderLines.selectRandomInstanceInTitleLookUP(`${testData.instance.instanceTitle}`, 0);
        OrderLines.editPOLineInfoAndChangeLocation(testData.locations[1].name, '2');
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        OrderLines.selectPOLInOrder(0);
        OrderLines.openLinkedInstance();
        InventoryInstance.checkIsHoldingsCreated([`${testData.locations[0].name} >`]);
        InventoryInstance.checkIsHoldingsCreated([`${testData.locations[1].name} >`]);
        InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
        InventoryInstance.openItemByBarcodeAndIndex('No barcode');
        InventoryItems.edit();
        ItemRecordEdit.addBarcode(barcodeForFirstItem);
        ItemRecordEdit.saveAndClose();
        // Need to wait,while instance will be saved
        cy.wait(7000);
        InventoryItems.closeItemInHeader();
        InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
        InventoryInstance.openItemByBarcodeAndIndex('No barcode');
        InventoryItems.edit();
        ItemRecordEdit.addBarcode(barcodeForSecondItem);
        ItemRecordEdit.saveAndClose();
        // Need to wait,while instance will be saved
        cy.wait(7000);
        InventoryItems.closeItemInHeader();
        InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForFirstItem);
        ItemRecordView.checkItemDetails(
          testData.locations[1].name,
          barcodeForFirstItem,
          ITEM_STATUS_NAMES.ON_ORDER,
        );
        InventoryItems.closeItemInHeader();
        InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
        ItemRecordView.checkItemDetails(
          testData.locations[1].name,
          barcodeForSecondItem,
          ITEM_STATUS_NAMES.ON_ORDER,
        );
        InventoryItems.closeItemInHeader();
      },
    );
  });
});
