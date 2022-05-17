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
import ConfirmMultiplePiecesItemCheckOut from '../../support/fragments/check-out/confirmMultiplePiecesItemCheckOut';
import {
  REQUEST_POLICY_NAMES,
  NOTICE_POLICY_NAMES,
  OVERDUE_FINE_POLICY_NAMES,
  LOAN_POLICY_NAMES,
  LOST_ITEM_FEES_POLICY_NAMES,
} from '../../support/constants';
import Requests from '../../support/fragments/requests/requests';
import updateUser from '../../support/fragments/user/updateUser';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('ui-inventory: Item status date updates', () => {
  const order = { ...NewOrder.defaultOrder };
  const instanceTitle = `autotest_title_${getRandomPostfix()}`;
  const orderLine = {
    ...basicOrderLine.defaultOrderLine,
    cost: { ...basicOrderLine.defaultOrderLine.cost, quantityPhysical: 1 },
    locations: [{ quantity: 1,
      quantityPhysical: 1 }],
    titleOrPackage: instanceTitle
  };
  let createdOrderNumber;
  const effectiveLocationServicePoint = NewServicePoint.getDefaulServicePoint();
  const effectiveLocationServicePointName = effectiveLocationServicePoint.body.name;
  const effectiveLocationServicePointId = effectiveLocationServicePoint.body.id;
  const notEffectiveLocationServicePoint = NewServicePoint.getDefaulServicePoint();
  const notEffectiveLocationServicePointName = notEffectiveLocationServicePoint.body.name;
  const effectiveLocation = { ...NewLocation.defaultUiLocation.body, servicePointIds: [effectiveLocationServicePoint.body.id], primaryServicePoint: effectiveLocationServicePoint.body.id };
  let itemLocation = '';
  let user = {};
  let userForDeliveryRequest = {};
  let userBarcode = '';
  const userItemBarcode = Helper.getRandomBarcode();
  let rulesDefaultString;
  const userRequestPreferences = {
    id: uuid(),
    fulfillment: 'Delivery',
    defaultDeliveryAddressTypeId: null,
    defaultServicePointId: effectiveLocationServicePointId,
    delivery: true,
    holdShelf: true,
    userId: userForDeliveryRequest.id,
  };
  let requestPolicyId;
  let noticePolicyId;
  let overdueFinePolicyId;
  let lostItemFeesPolicyId;
  let loanPolicyId;

  before(() => {
    //* ** */
    cy.createTempUser([
      permissions.uiCreateOrderAndOrderLine.gui,
      permissions.uiEditOrderAndOrderLine.gui,
      permissions.uiCanViewOrderAndOrderLine.gui,
      permissions.inventoryAll.gui,
      permissions.checkinAll.gui,
      permissions.uiReceivingViewEditCreate.gui,
      permissions.checkoutAll.gui,
      permissions.requestsAll.gui,
      permissions.loansAll.gui,
      permissions.uiInventoryStorageModule.gui,
      permissions.uiUsersDeclareItemLost.gui,
      permissions.usersLoansRenewThroughOverride.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.getAdminToken()
          .then(() => {
            cy.getOrganizationApi({ query: 'name="Amazon.com"' })
              .then(organization => {
                order.vendor = organization.id;
                orderLine.physical.materialSupplier = organization.id;
                orderLine.eresource.accessProvider = organization.id;
              });
            cy.getMaterialTypes({ query: 'name="book"' })
              .then(materialType => { orderLine.physical.materialType = materialType.id; });
          });
        ServicePoints.createViaApi(effectiveLocationServicePoint.body);
        ServicePoints.createViaApi(notEffectiveLocationServicePoint.body);
        cy.addServicePointToUser([effectiveLocationServicePoint.body.id, notEffectiveLocationServicePoint.body.id],
          user.userId, effectiveLocationServicePoint.body.id);
        Locations.createLocationViaApi(effectiveLocation)
          .then(locations => {
            orderLine.locations[0].locationId = locations.body.id;
            itemLocation = locations.body.name;
          });
        cy.login(userProperties.username, userProperties.password)
          .then(() => {
            Orders.createOrderWithOrderLineViaApi(order, orderLine)
              .then(orderNumber => {
                createdOrderNumber = orderNumber;
              });
          })
          .then(() => {
            cy.getRequestPolicy({ query: `name=="${REQUEST_POLICY_NAMES.ALLOW_ALL}"` })
              .then(policies => {
                requestPolicyId = policies[0].id;
              });
            cy.getNoticePolicy({ query: `name=="${NOTICE_POLICY_NAMES.SEND_NO_NOTICES}"` })
              .then(policies => {
                noticePolicyId = policies[0].id;
              });
            cy.getOverdueFinePolicy({ query: `name=="${OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY}"` })
              .then(policies => {
                overdueFinePolicyId = policies[0].id;
              });
            cy.getLostItemFeesPolicy({ query: `name=="${LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY}"` })
              .then(policies => {
                lostItemFeesPolicyId = policies[0].id;
              });
            cy.getLoanPolicy({ query: `name=="${LOAN_POLICY_NAMES.EXAMPLE_LOAN_POLICY}"` })
              .then(policies => {
                loanPolicyId = policies[0].id;
              });
            cy.getCirculationRules()
              .then(rules => {
                rulesDefaultString = rules.rulesAsText;
              });
          })
          .then(() => {
            const newRule = `\ng ${user.patronGroup} + m ${orderLine.physical.materialType}: l ${loanPolicyId} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;

            cy.updateCirculationRules({
              rulesAsText: rulesDefaultString + newRule,
            });
          });
        cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
          .then((users) => {
            userBarcode = users[0].barcode;
          });
      });
    /** * */

    cy.createTempUser([
      permissions.checkoutAll.gui,
      permissions.requestsAll.gui,
    ])
      .then(userProperties => {
        userForDeliveryRequest = userProperties;
        cy.getUsers({ limit: 1, query: `"username"="${userForDeliveryRequest.username}"` })
          .then((users) => {
            userForDeliveryRequest.barcode = users[0].barcode;
            userRequestPreferences.userId = users[0].id;
            cy.getAddressTypesApi({ limit: 1 }).then(addressTypes => {
              userRequestPreferences.defaultDeliveryAddressTypeId = addressTypes[0].id;
            })
              .then(() => {
                updateUser.updateUserAddress(users[0], [{ city: 'New York',
                  addressTypeId: userRequestPreferences.defaultDeliveryAddressTypeId,
                  countryId: 'US' }]);
                cy.createUserRequestPreferencesApi(userRequestPreferences);
              });
          });
      });
  });

  afterEach(() => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${userItemBarcode}"` })
      .then((instance) => {
        instance.items.forEach((item) => {
          cy.deleteItem(item.id);
        });
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.deleteOrderApi(order.id);
    cy.deleteUser(user.userId);
    cy.deleteServicePoint(notEffectiveLocationServicePoint.body.id);
    // cy.deleteServicePoint(effectiveLocationServicePoint.body.id);
    Requests.getRequestApi({ limit: 1, query: `"item.barcode"=="${userItemBarcode}"` })
      .then(request => {
        Requests.deleteRequestApi(request.id);
      });
  });

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    const caption = 'autotestCaption';
    const numberOfPieces = '3';

    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView('No barcode');
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.onOrder);

    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, userItemBarcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inProcess);

    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);

    ItemVeiw.clickMarkAsMissing();
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.missing);

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmMissingModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);

    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePointName);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.inTransit);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.inTransit);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);

    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);

    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest({
      itemBarcode: userItemBarcode,
      itemTitle: null,
      requesterBarcode: userBarcode,
      pickupServicePoint: effectiveLocationServicePointName,
    });
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.paged);

    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePointName);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.inTransit);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);

    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.awaitingPickup);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingPickup);

    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, userItemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupCheckInModal();
    CheckOut.openItemRecordInInventory(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);

    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(user.username);
    UsersSearchPane.openUser(user.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    UserLoans.declareLoanLost();
    ConfirmItemStatusModal.confirmItemStatus();
    UserLoans.openItemRecordInInventory(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.declaredLost);

    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(user.username);
    UsersSearchPane.openUser(user.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    UserLoans.renewItem(userItemBarcode);
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    UserLoans.openItemRecordInInventory(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);

    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    InventoryInstance.openEditItemPage();
    ItemVeiw.addPieceToItem(numberOfPieces);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);

    cy.visit(TopMenu.requestsPath);
    NewRequest.createDeliveryRequest({
      itemBarcode: userItemBarcode,
      itemTitle: null,
      requesterBarcode: userForDeliveryRequest.barcode,
    });
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmMultipieceItemModal();
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, userItemBarcode);
    ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingDelivery);

    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, userItemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupCheckInModal();
    CheckOut.openItemRecordInInventory(userItemBarcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);

    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings([itemLocation]);
    InventoryInstance.openItemView(userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
  });
});
