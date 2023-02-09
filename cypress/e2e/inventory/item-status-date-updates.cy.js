/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../support/utils/stringTools';
import {
  REQUEST_POLICY_NAMES,
  NOTICE_POLICY_NAMES,
  OVERDUE_FINE_POLICY_NAMES,
  CY_ENV,
  LOST_ITEM_FEES_POLICY_NAMES,
  LOAN_POLICY_NAMES,
} from '../../support/constants';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import ItemRecordView from '../../support/fragments/inventory/itemRecordView';
import Receiving from '../../support/fragments/receiving/receiving';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SwitchServicePoint from '../../support/fragments/servicePoint/switchServicePoint';
import NewRequest from '../../support/fragments/requests/newRequest';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import ConfirmItemStatusModal from '../../support/fragments/users/loans/confirmItemStatusModal';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../support/fragments/users/loans/overrideAndRenewModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import DateTools from '../../support/utils/dateTools';

describe('ui-inventory: Item status date updates', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  let orderNumber;
  let effectiveLocationServicePoint;
  let notEffectiveLocationServicePoint;
  let effectiveLocation;
  let userForDeliveryRequest = {};
  const itemBarcode = Helper.getRandomBarcode();
  const userName = Cypress.env('diku_login');

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
        cy.getLoanPolicy({ query: `name=="${LOAN_POLICY_NAMES.EXAMPLE_LOAN}"` });
        cy.getRequestPolicy({ query: `name=="${REQUEST_POLICY_NAMES.ALLOW_ALL}"` });
        cy.getNoticePolicy({ query: `name=="${NOTICE_POLICY_NAMES.SEND_NO_NOTICES}"` });
        cy.getOverdueFinePolicy({ query: `name=="${OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY}"` });
        cy.getLostItemFeesPolicy({ query: `name=="${LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY}"` });
      }).then(() => {
        const loanPolicy = Cypress.env(CY_ENV.LOAN_POLICY).id;
        const requestPolicyId = Cypress.env(CY_ENV.REQUEST_POLICY)[0].id;
        const noticePolicyId = Cypress.env(CY_ENV.NOTICE_POLICY)[0].id;
        const overdueFinePolicyId = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY)[0].id;
        const lostItemFeesPolicyId = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY)[0].id;
        const policy = `l ${loanPolicy} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;
        const priority = 'priority: number-of-criteria, criterium (t, s, c, b, a, m, g), last-line';
        const newRule = `${priority}\nfallback-policy: ${policy}`;

        cy.updateCirculationRules({
          rulesAsText: newRule,
        });
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' })
          .then((servicePoints) => {
            effectiveLocationServicePoint = servicePoints[0];
            NewLocation.createViaApi(NewLocation.getDefaultLocation(effectiveLocationServicePoint.id))
              .then((location) => {
                console.log(location);
                effectiveLocation = location;
                Orders.createOrderWithOrderLineViaApi(
                  NewOrder.getDefaultOrder(),
                  BasicOrderLine.getDefaultOrderLine(itemQuantity, instanceTitle, effectiveLocation.id)
                )
                  .then(order => {
                    orderNumber = order;
                  });
              });
          });
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Online"' })
          .then((servicePoints) => {
            notEffectiveLocationServicePoint = servicePoints[0];
          });
      });

    cy.createTempUser([
      permissions.checkoutAll.gui,
      permissions.requestsAll.gui,
    ])
      .then(userProperties => {
        userForDeliveryRequest = userProperties;

        cy.getRequestPreference({ limit: 1, query: `"userId"="${userForDeliveryRequest.userId}"` })
          .then((response) => {
            cy.updateRequestPreference(response.body.requestPreferences[0].id, {
              defaultDeliveryAddressTypeId: '46ff3f08-8f41-485c-98d8-701ba8404f4f',
              defaultServicePointId: null,
              delivery: true,
              fulfillment: 'Delivery',
              holdShelf: true,
              userId: userForDeliveryRequest.userId
            });
          });
      });
  });

  // afterEach(() => {
  //   InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
  //   Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
  //     .then(order => Orders.deleteOrderApi(order[0].id));
  //   Users.deleteViaApi(userForDeliveryRequest.userId);
  //   NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
  //     effectiveLocation.institutionId,
  //     effectiveLocation.campusId,
  //     effectiveLocation.libraryId,
  //     effectiveLocation.id
  //   );
  // });

  // test is looping
  it('C9200 Item status date updates (folijet) (prokopovych)', () => {
    const caption = `autotest_caption_${getRandomPostfix()}`;
    const numberOfPieces = '3';
    // open order and create Item
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView('No barcode');
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.onOrder);
    cy.log(`###${ItemRecordView.itemStatuses.onOrder}###`);

    // receive item
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.receiveOrderViaActions();
    Receiving.selectFromResultsList(instanceTitle);
    Receiving.receivePiece(0, caption, itemBarcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.inProcess);
    cy.log(`###${ItemRecordView.itemStatuses.inProcess}###`);

    // check in item at service point assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    CheckInActions.checkInItem(itemBarcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.available);
    cy.log(`###${ItemRecordView.itemStatuses.available}###`);

    // mark item as missing
    ItemRecordView.clickMarkAsMissing();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.missing);

    // check in item at service point assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmMissingModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.available);
    cy.log(`###${ItemRecordView.itemStatuses.available}###`);

    // check in item at service point assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.available);
    cy.log(`###${ItemRecordView.itemStatuses.available}###`);

    // check in item at service point not assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.inTransit);
    cy.log(`###${ItemRecordView.itemStatuses.inTransit}###`);

    // check in item at service point not assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.inTransit);
    cy.log(`###${ItemRecordView.itemStatuses.inTransit}###`);

    // check in item at service point assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    CheckInActions.checkInItem(itemBarcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.available);
    cy.log(`###${ItemRecordView.itemStatuses.available}###`);

    // create Page request on an item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createWithUserName({
      itemBarcode,
      requesterName: userName,
      pickupServicePoint: effectiveLocationServicePoint.name
    });
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.paged);
    cy.log(`###${ItemRecordView.itemStatuses.paged}###`);

    // check in item at a service point other than the pickup service point for the request
    cy.visit(TopMenu.checkInPath);
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.inTransit);
    cy.log(`###${ItemRecordView.itemStatuses.inTransit}###`);

    // check in item at the pickup service point for the page request
    cy.visit(TopMenu.checkInPath);
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmAvaitingPickUpModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.awaitingPickup);
    cy.log(`###${ItemRecordView.itemStatuses.awaitingPickup}###`);

    // check out item to user for whom page request was created
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkOutItemWithUserName(userName, itemBarcode);
    ConfirmItemInModal.confirmAvaitingPickupCheckInModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.checkedOut);
    cy.log(`###${ItemRecordView.itemStatuses.checkedOut}###`);

    // declare item lost
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(userName);
    UsersSearchPane.selectUserFromList(userName);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    UserLoans.declareLoanLostByBarcode(itemBarcode);
    ConfirmItemStatusModal.confirmItemStatus();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.declaredLost);
    cy.log(`###${ItemRecordView.itemStatuses.declaredLost}###`);

    // renew item (through override)
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(userName);
    UsersSearchPane.selectUserFromList(userName);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    UserLoans.renewByBarcode(itemBarcode);
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(effectiveLocation.name);
    InventoryInstance.openItemView(itemBarcode);
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.checkedOut);
    cy.log(`###${ItemRecordView.itemStatuses.checkedOut}###`);

    // edit item record so that it has multiple pieces
    InventoryInstance.edit();
    ItemRecordView.addPieceToItem(numberOfPieces);
    ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.checkedOut);

    // create delivery request (hold or recall) on item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createDeliveryRequest(
      {
        itemBarcode,
        requestType: 'Delivery',
        requesterBarcode: userForDeliveryRequest.barcode,
      }
    );
    // cy.visit(TopMenu.checkInPath);
    // CheckInActions.checkInItem(itemBarcode);
    // ConfirmItemInModal.confirmMultipieceCheckInModal();
    // cy.visit(TopMenu.checkOutPath);
    // CheckOutActions.checkOutItemWithUserName(userName, itemBarcode);
    // CheckOutActions.cancelMultipleCheckOutModal();
    // cy.visit(TopMenu.inventoryPath);
    // InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    // InventoryInstances.selectInstance();
    // InventoryInstance.openHoldings(effectiveLocation.name);
    // InventoryInstance.openItemView(itemBarcode);
    // ItemRecordView.verifyUpdatedItemDate();
    // ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.awaitingDelivery);
    // cy.log(`###${ItemRecordView.itemStatuses.awaitingDelivery}###`);

    // // check out item to user with delivery request
    // cy.visit(TopMenu.checkOutPath);
    // CheckOutActions.checkOutItemWithUserName(userForDeliveryRequest.username, itemBarcode);
    // cy.visit(TopMenu.inventoryPath);
    // InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    // InventoryInstances.selectInstance();
    // InventoryInstance.openHoldings(effectiveLocation.name);
    // InventoryInstance.openItemView(itemBarcode);
    // ItemRecordView.verifyUpdatedItemDate();
    // ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.checkedOut);
    // cy.log(`###${ItemRecordView.itemStatuses.checkedOut}###`);

    // // check in item at service point assigned to its effective location
    // cy.visit(TopMenu.checkInPath);
    // SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    // CheckInActions.backdateCheckInItem(DateTools.getPreviousDayDate(), itemBarcode);
    // cy.visit(TopMenu.inventoryPath);
    // InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    // InventoryInstances.selectInstance();
    // InventoryInstance.openHoldings(effectiveLocation.name);
    // InventoryInstance.openItemView(itemBarcode);
    // ItemRecordView.verifyUpdatedItemDate();
    // ItemRecordView.verifyItemStatus(ItemRecordView.itemStatuses.available);
    // cy.log(`###${ItemRecordView.itemStatuses.available}###`);
  });
});
