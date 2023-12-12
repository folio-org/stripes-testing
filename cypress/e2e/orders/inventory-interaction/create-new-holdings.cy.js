/* eslint-disable spaced-comment */
import { Permissions } from '../../../support/dictionary';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import TopMenu from '../../../support/fragments/topMenu';
import Helper from '../../../support/fragments/finance/financeHelper';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';

describe('Orders: Inventory interaction', () => {
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
    // InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    // testData.locations.forEach((location) => {
    //   Locations.deleteViaApi(location);
    // });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C375238 Create new holdings for already existing location when editing an order line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'system'] },
    () => {
      Orders.selectOrderByPONumber(testData.orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.selectRandomInstanceInTitleLookUP(`${testData.instance.instanceTitle}`, 0);
      OrderLines.editPOLineInfoAndChangeLocation(
        `${testData.organization.accounts[0].name} (${testData.organization.accounts[0].accountNo})`,
        'Purchase',
        testData.locations[1].institutionId,
        '2',
      );
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
      InventoryItems.closeItem();
      InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
      InventoryInstance.openItemByBarcodeAndIndex('No barcode');
      InventoryItems.edit();
      ItemRecordEdit.addBarcode(barcodeForSecondItem);
      ItemRecordEdit.saveAndClose();
      // Need to wait,while instance will be saved
      cy.wait(7000);
      InventoryItems.closeItem();
      InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
      InventoryInstance.openItemByBarcodeAndIndex(barcodeForFirstItem);
      ItemRecordView.checkItemDetails(
        testData.locations[1].name,
        barcodeForFirstItem,
        ITEM_STATUS_NAMES.ON_ORDER,
      );
      InventoryItems.closeItem();
      InventoryInstance.openHoldingsAccordion(testData.locations[1].name);
      InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
      ItemRecordView.checkItemDetails(
        testData.locations[1].name,
        barcodeForSecondItem,
        ITEM_STATUS_NAMES.ON_ORDER,
      );
      InventoryItems.closeItem();
    },
  );
});
