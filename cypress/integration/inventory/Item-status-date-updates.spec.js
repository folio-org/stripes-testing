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
  let effectiveLocationServicePointId = '';
  let effectiveLocationServicePointName = '';
  let notEffectiveLocationServicePointId = '';
  let notEffectiveLocationServicePointName = '';
  let itemLocation = '';
  let user = {};

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getServicePointsApi({ limit: 2, query: 'pickupLocation=="true"' }).then(servicePoints => {
          effectiveLocationServicePointId = servicePoints[0].id;
          effectiveLocationServicePointName = servicePoints[0].name;
          notEffectiveLocationServicePointId = servicePoints[1].id;
          notEffectiveLocationServicePointName = servicePoints[1].name;
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
        cy.addServicePointToUser(effectiveLocationServicePointId, user.userId);
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
        cy.getLocations({ limit: 1, query: `servicePointIds==["${effectiveLocationServicePointId}"]` })
          .then(location => {
            orderLine.locations[0].locationId = location.id;
            itemLocation = location.name;
          });
      })
      .then(() => {
        Orders.createOrderWithOrderLineViaApi(order, orderLine)
          .then(orderNumber => {
            createdOrderNumber = orderNumber;
          });
      });
  });

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    const barcode = Helper.getRandomBarcode();
    const caption = 'autotestCaption';

    // open order and create Item
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.openOrder();
    // OrdersHelper.verifyOrderDateOpened();
    // open Item view in Inventory
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView('No barcode');
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.onOrder);
    cy.log('On order');

    
  });
});
