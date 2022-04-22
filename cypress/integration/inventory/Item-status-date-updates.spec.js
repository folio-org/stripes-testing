import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import ItemVeiw from '../../support/fragments/inventory/inventoryItem/itemVeiw';
import Receiving from '../../support/fragments/receiving/receiving';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemMissingCheckInModal from '../../support/fragments/check-in-actions/confirmItemMissingCheckInModal';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';

describe('ui-inventory: Item status date updates', () => {
  const order = { ...NewOrder.specialOrder };
  const orderLine = {
    id: uuid(),
    checkinItems: false,
    acquisitionMethod: '',
    alerts: [],
    claims: [],
    contributors: [],
    cost: {
      listUnitPrice: 1.0,
      currency: 'USD',
      discountType: 'percentage',
      quantityPhysical: 1,
      poLineEstimatedPrice: 1.0
    },
    details: {
      productIds: [],
      subscriptionInterval: 0
    },
    fundDistribution : [],
    isPackage: false,
    locations: [
      {
        locationId: '',
        quantity: 1,
        quantityPhysical: 1
      }
    ],
    orderFormat: 'Physical Resource',
    paymentStatus: 'Pending',
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: '',
      materialSupplier: '',
      volumes: []
    },
    eresource: {
      activated: false,
      createInventory: 'None',
      trial: false,
      accessProvider: ''
    },
    purchaseOrderId: '',
    receiptStatus: 'Pending',
    reportingCodes: [],
    source: 'User',
    titleOrPackage: `autotest_line_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: '',
      vendorAccount: '1234'
    }
  };
  let createdOrderNumber;
  const instanceTitle = orderLine.titleOrPackage;
  const userId = '';
  let defaultServicePointId = '';
  let itemLocation = '';
  let user = {};


  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getServicePointsApi({ limit: 2, query: 'pickupLocation=="true"' }).then(servicePoints => {
          defaultServicePointId = servicePoints[0].id;
          console.log(servicePoints[0].id);
        });
      })
      .then(() => {
        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.uiCreateOrder.gui,
          permissions.uiCreateOrderLine.gui,
          permissions.uiApproveOrder.gui,
          permissions.uiEditOrder.gui,
          permissions.uiCheckInAll.gui,
          permissions.uiReceivingViewEditCreate.gui,
        ]);
      })
      .then(userProperties => {
        user = userProperties;
        cy.addServicePointToUser(defaultServicePointId, user.userId);
        console.log(defaultServicePointId);
      })
      .then(() => {
        cy.login(user.username, user.password);
      })
      .then(() => {
        cy.getOrganizationApi({ query: 'name="Amazon.com"' })
          .then(organization => {
            order.vendor = organization.id;
            orderLine.physical.materialSupplier = organization.id;
            orderLine.eresource.accessProvider = organization.id;
          });
        cy.getMaterialTypes({ query: 'name="book"' })
          .then(materialType => { orderLine.physical.materialType = materialType.id; });
        cy.getLocations({ limit: 1 })
          .then(location => {
            orderLine.locations[0].locationId = location.id;
            itemLocation = location.name;
            console.log(itemLocation);
          });
      })
      .then(() => {
        Orders.createOrderWithOrderLineViaApi(order, orderLine)
          .then(orderNumber => {
            createdOrderNumber = orderNumber;
          });
      });
  });

  after(() => {
    // cy.deleteUser(userId);
  });

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    const barcode = Helper.getRandomBarcode();
    const caption = 'autotestCaption';

    // open order and create Item
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    // open Item view in Inventory
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView('No barcode');
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.onOrder);
    cy.log('On order');

    // receive item
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, barcode);
    // open Item view in Inventory
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inProcess);
    cy.log('In process');

    cy.visit(TopMenu.checkInPath);
    //##############
    SwitchServicePoint.switchServicePoint();
    cy.pause();
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('Available');

    ItemVeiw.clickMarkAsMissing();
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.missing);
    cy.log('Missing');

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('Available');

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('Available');

    // switch to other service point
    SwitchServicePoint.switchServicePoint();
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    // ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('In transit');

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    // ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('In transit');
  });
});
