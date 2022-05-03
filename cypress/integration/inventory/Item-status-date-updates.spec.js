import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import ItemVeiw from '../../support/fragments/inventory/inventoryItem/itemVeiw';
import Receiving from '../../support/fragments/receiving/receiving';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';
import NewRequest from '../../support/fragments/requests/newRequest';
import CheckOut from '../../support/fragments/check-out/checkOut';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';
import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Locations from '../../support/fragments/settings/tenant/locations/locations';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import ConfirmItemStatusModal from '../../support/fragments/users/loans/confirmItemStatusModal';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../support/fragments/users/loans/overrideAndRenewModal';
import ReceivingItemView from '../../support/fragments/receiving/receivingItemView';
import AddNewPieceModal from '../../support/fragments/receiving/addNewPieceModal';
import ConfirmMultiplePiecesItemCheckOut from '../../support/fragments/check-out/confirmMultiplePiecesItemCheckOut';
import {
  REQUEST_POLICY_NAMES,
  NOTICE_POLICY_NAMES,
  OVERDUE_FINE_POLICY_NAMES,
  CY_ENV,
  LOAN_POLICY_NAMES,
  LOST_ITEM_FEES_POLICY_NAMES,
} from '../../support/constants';

describe('ui-inventory: Item status date updates', () => {
  const order = { ...NewOrder.specialOrder };
  const instanceTitle = `autotest_title_${getRandomPostfix()}`;
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
    titleOrPackage: `autotest_title_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: '',
      vendorAccount: '1234'
    }
  };
  let createdOrderNumber;
  const effectiveLocationServicePoint = NewServicePoint.getDefaulServicePoint();
  const effectiveLocationServicePointName = effectiveLocationServicePoint.body.name;
  const notEffectiveLocationServicePoint = NewServicePoint.getDefaulServicePoint();
  const notEffectiveLocationServicePointName = notEffectiveLocationServicePoint.body.name;
  const effectiveLocation = { ...NewLocation.defaultUiLocation.body, servicePointIds: [effectiveLocationServicePoint.body.id], primaryServicePoint: effectiveLocationServicePoint.body.id };
  let itemLocation = '';
  let user = {};
  let userBarcode = '';
  const itemBarcode = Helper.getRandomBarcode();
  let rulesDefaultString;

  before(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getOrganizationApi({ query: 'name="Amazon.com"' })
          .then(organization => {
            order.vendor = organization.id;
            orderLine.physical.materialSupplier = organization.id;
            orderLine.eresource.accessProvider = organization.id;
          });
      })
      .then(() => {
        cy.getMaterialTypes({ query: 'name="book"' })
          .then(materialType => {
            orderLine.physical.materialType = materialType.id;
          });
      })
      .then(() => {
        cy.createTempUser([
          permissions.uiCreateOrderAndOrderLine.gui,
          permissions.uiEditOrderAndOrderLine.gui,
          permissions.uiCanViewOrderAndOrderLine.gui,
          permissions.uiApproveOrder.gui,
          permissions.inventoryAll.gui,
          permissions.checkinAll.gui,
          permissions.uiReceivingViewEditCreate.gui,
          permissions.checkoutAll.gui,
          permissions.requestsAll.gui,
          permissions.loansAll.gui,
        ]);
      })
      .then(userProperties => {
        user = userProperties;
        ServicePoints.createViaApi(effectiveLocationServicePoint.body);
        ServicePoints.createViaApi(notEffectiveLocationServicePoint.body);
        cy.addServicePointToUser([effectiveLocationServicePoint.body.id, notEffectiveLocationServicePoint.body.id],
          user.userId, effectiveLocationServicePoint.body.id);
        Locations.createLocationViaApi(effectiveLocation)
          .then(locations => {
            orderLine.locations[0].locationId = locations.body.id;
            itemLocation = locations.body.name;
          });
      })
      .then(() => {
        cy.login(user.username, user.password);
        Orders.createOrderWithOrderLineViaApi(order, orderLine)
          .then(orderNumber => {
            createdOrderNumber = orderNumber;
          });
        cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
          .then((users) => {
            userBarcode = Cypress.env('users')[0].barcode;
          });
      })
      .then(() => {
        cy.getRequestPolicy({ query: `name=="${REQUEST_POLICY_NAMES.ALLOW_ALL}"` });
        cy.getNoticePolicy({ query: `name=="${NOTICE_POLICY_NAMES.SEND_NO_NOTICES}"` });
        cy.getOverdueFinePolicy({ query: `name=="${OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY}"` });
        cy.getLostItemFeesPolicy({ query: `name=="${LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY}"` });
        cy.getLoanPolicy({ query: `name=="${LOAN_POLICY_NAMES.EXAMPLE_LOAN_POLICY}"` });
        cy.getCirculationRules()
          .then(rules => {
            rulesDefaultString = rules.rulesAsText;
          });
      })
      .then(() => {
        const requestPolicyId = Cypress.env(CY_ENV.REQUEST_POLICY)[0].id;
        const noticePolicyId = Cypress.env(CY_ENV.NOTICE_POLICY)[0].id;
        const overdueFinePolicyId = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY)[0].id;
        const lostItemFeesPolicyId = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY)[0].id;
        const loanPolicyId = Cypress.env(CY_ENV.LOAN_POLICIES)[0].id;
        const newRule = `\ng ${user.patronGroup} + m ${orderLine.physical.materialType}: l ${loanPolicyId} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;

        cy.updateCirculationRules({
          rulesAsText: rulesDefaultString + newRule,
        });
      });
  });

  afterEach(() => {
    /* cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemBarcode}"` })
      .then((instance) => {
        instance.items.forEach((item) => {
          cy.deleteItem(item.id);
        });
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.deleteOrderApi(order.id);
    cy.deleteLoanPolicy(createdLoanPolicy.id)
      .then(() => {
        cy.deleteFixedDueDateSchedule(mySchedule.id);
      });

     ServicePoints.forEach(servicePoint => {
      cy.deleteServicePoint(servicePoint.id);
    });
    Requests.deleteRequestApi(id);
    cy.deleteUser(user.userId); */
  });

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    const caption = 'autotestCaption';
    const requestRecord = {
      itemBarcode,
      itemTitle: null,
      requesterBarcode: userBarcode,
      pickupServicePoint: effectiveLocationServicePointName,
    };

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
    cy.log('###On order###');

    // receive item
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, itemBarcode);
    // open Item view in Inventory
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inProcess);
    cy.log('###In process###');

    // ##############check in item at service point assigned to its effective location ##Available
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    CheckInActions.checkInItem(itemBarcode);
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // ##############mark item as missing ##Missing
    ItemVeiw.clickMarkAsMissing();
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.missing);
    cy.log('###Missing###');

    // ##############check in item at service point assigned to its effective location ##Available
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmMissingModal();
    // CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // ##############check in item at service point assigned to its effective location ##Available
    CheckInActions.checkInItem(itemBarcode);
    // CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // ##############check in item at service point not assigned to its effective location ##In transit
    // switch to other service point
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePointName);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.inTransit);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // ##############check in item at service point not assigned to its effective location ##In transit
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.inTransit);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // ##############check in item at service point assigned to its effective location ##Available
    // switch to other service point
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    CheckInActions.checkInItem(itemBarcode);
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // ##############in Requests app, create Page request on an item ##Paged
    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest(requestRecord);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.paged);
    cy.log('###Paged###');

    // ##############check in item at a service point other than the pickup service point for the request ##In transit
    // switch to other service point
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePointName);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.inTransit);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // ##############check in item at the pickup service point for the page request ##Awaiting pickup
    // switch to other service point
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.awaitingPickup);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingPickup);
    cy.log('###Awaiting pickup###');

    // ##############check out item to user for whom page request was created ##Checked out
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupCheckInModal();
    CheckOut.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // ##############In Users app on loan details for the loan from step 11, declare item lost ##Declared lost
    cy.visit(TopMenu.usersPath);
    // show open loans
    UsersSearchPane.searchByKeywords(user.username);
    UsersSearchPane.openUser(user.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    UserLoans.declareLoanLost();
    ConfirmItemStatusModal.confirmItemStatus();
    UserLoans.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.declaredLost);
    cy.log('###Declared lost###');

    // ##############In Users app on loan details for the loan, renew item (through override) ##Checked out
    cy.visit(TopMenu.usersPath);
    // show open loans
    UsersSearchPane.searchByKeywords(user.username);
    UsersSearchPane.openUser(user.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    UserLoans.renewItem(itemBarcode);
    RenewConfirmationModal.confirmRenewItem();
    OverrideAndRenewModal.confirmOverrideItem();
    UserLoans.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // ##############Edit item record so that it has multiple pieces ##Checked out
    cy.visit(TopMenu.receivingPath);
    Receiving.searchByParameter('Title (all)', instanceTitle);
    Receiving.selectReceivingItem();
    ReceivingItemView.addPiece();
    AddNewPieceModal.createPiece();
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // ##############Create delivery request (hold or recall) on item. Check in item (confirm check in for multiple pieces).
    // When directed to Check Out app, cancel check out when presented with multiple pieces modal. ##Awaiting delivery
    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest(requestRecord);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmMultipieceItemModal();
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, itemBarcode);
    ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingDelivery);
    cy.log('###Awaiting delivery###');

    // ##############Check out item to user with delivery request ##Checked out
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupCheckInModal();
    CheckOut.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // ##############In Check In app, backdate check in. Check in item at service point assigned to its effective location. ##Available
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');
  });
});
