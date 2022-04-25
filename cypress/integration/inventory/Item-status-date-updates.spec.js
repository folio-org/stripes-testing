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
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemMissingCheckInModal from '../../support/fragments/check-in-actions/confirmItemMissingCheckInModal';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';

describe('ui-inventory: Item status date updates', () => {
  let userId = '';
  //добавить юзера и баркод ему
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
  let itemLocation = '';

  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
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
          });
        //cy.getUserServicePoints(Cypress.env('users')[0].id);
        Orders.createOrderWithOrderLineViaApi(order, orderLine)
          .then(orderNumber => {
            createdOrderNumber = orderNumber;
          });
      });
  });

  after(() => {
    
  });

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    const barcode = Helper.getRandomBarcode();
    const caption = 'autotestCaption';
    const requestRecord = {
      itemBarcode: barcode,
      itemTitle: null,
      requesterBarcode: userId,
      pickupServicePoint: 'Circ Desk 1',
    };

    // open order and create Item
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.openOrder();
    //==OrdersHelper.verifyOrderDateOpened();
    // open Item view in Inventory
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView('No barcode');
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.onOrder);
    cy.log('###On order###');

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
    cy.log('###In process###');

    cy.visit(TopMenu.checkInPath);
    // ##############check in item at service point assigned to its effective location ##Available
    SwitchServicePoint.switchToAssignedServicePoint();
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // ##############mark item as missing ##Missing
    /*ItemVeiw.clickMarkAsMissing();
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.missing);
    cy.log('###Missing###');

    cy.visit(TopMenu.checkInPath);
    // ##############check in item at service point assigned to its effective location ##Available
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    //ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    cy.visit(TopMenu.checkInPath);
    // ##############check in item at service point assigned to its effective location ##Available
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    //ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // switch to other service point
    //SwitchServicePoint.switchToNotAssignedServicePoint();
    cy.visit(TopMenu.checkInPath);
    // ##############check in item at service point not assigned to its effective location ##In transit
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    //ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    cy.visit(TopMenu.checkInPath);
    // ##############check in item at service point not assigned to its effective location ##In transit
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    // ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // switch to other service point
    //SwitchServicePoint.switchToNotAssignedServicePoint();
    cy.visit(TopMenu.checkInPath);
    // ##############check in item at service point assigned to its effective location ##Available
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    // ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');*/

    // ##############in Requests app, create Page request on an item ##Paged
    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest(requestRecord);
    
    cy.wait(2000);
    /*cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    cy.wait(60000);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.paged);*/
    cy.log('###Paged###');

    // ##############check in item at a service point other than the pickup service point for the request ##In transit
    // switch to other service point
    //SwitchServicePoint.switchToNotAssignedServicePoint();
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // ##############check in item at the pickup service point for the page request ##Awaiting pickup
    // switch to other service point
    //SwitchServicePoint.switchToNotAssignedServicePoint();
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItemWithEffectiveLocation(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(barcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingPickup);
    cy.log('###Awaiting pickup###');

    // ##############check out item to user for whom page request was created ##Checked out

    // ##############In Users app on loan details for the loan from step 11, declare item lost ##Declared lost
  });
});
