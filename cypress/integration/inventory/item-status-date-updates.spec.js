import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import ItemVeiw from '../../support/fragments/inventory/inventoryItem/itemVeiw';
import Receiving from '../../support/fragments/receiving/receiving';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';
import NewRequest from '../../support/fragments/requests/newRequest';
import CheckOut from '../../support/fragments/check-out/checkOut';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';
import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import ConfirmItemStatusModal from '../../support/fragments/users/loans/confirmItemStatusModal';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../support/fragments/users/loans/overrideAndRenewModal';
import ConfirmMultiplePiecesItemCheckOut from '../../support/fragments/check-out/confirmMultiplePiecesItemCheckOut';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import Requests from '../../support/fragments/requests/requests';
import UpdateUser from '../../support/fragments/user/updateUser';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewLocations from '../../support/fragments/settings/tenant/locations/newLocation';
import UsersEditPage from '../../support/fragments/users/usersEditPage';
import Users from '../../support/fragments/users/users';

describe('ui-inventory: Item status date updates', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  let orderNumber;
  let effectiveLocationServicePoint;
  let notEffectiveLocationServicePoint;
  let effectiveLocation;
  let user = {};
  let userForDeliveryRequest = {};
  let userBarcode = '';
  const itemBarcode = Helper.getRandomBarcode();
  let userRequestPreferences;

  before(() => {
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
      permissions.usersLoansRenewThroughOverride.gui,
      permissions.uiUserEdit.gui
    ])
      .then(userProperties => {
        user = userProperties;
        effectiveLocationServicePoint = NewServicePoint.getDefaulServicePoint();
        notEffectiveLocationServicePoint = NewServicePoint.getDefaulServicePoint();

        ServicePoints.createViaApi(effectiveLocationServicePoint);
        ServicePoints.createViaApi(notEffectiveLocationServicePoint);
        cy.addServicePointToUser([effectiveLocationServicePoint.id, notEffectiveLocationServicePoint.id],
          user.userId, effectiveLocationServicePoint.id);

        userRequestPreferences = {
          id: uuid(),
          fulfillment: 'Delivery',
          defaultDeliveryAddressTypeId: null,
          defaultServicePointId: effectiveLocationServicePoint.id,
          delivery: true,
          holdShelf: true,
          userId: userForDeliveryRequest.id,
        };

        cy.login(userProperties.username, userProperties.password)
          .then(() => {
            NewLocations.createViaApi(NewLocations.getDefaultLocation(effectiveLocationServicePoint.id))
              .then((location) => {
                effectiveLocation = location;
                Orders.createOrderWithOrderLineViaApi(
                  NewOrder.getDefaultOrder(),
                  BasicOrderLine.getDefaultOrderLine(itemQuantity, instanceTitle, location.id)
                )
                  .then(order => {
                    orderNumber = order;
                  });
              });
          });

        cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
          .then((users) => {
            userBarcode = users[0].barcode;
          });
      });

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
                UpdateUser.updateUserAddress(users[0], [{ city: 'New York',
                  addressTypeId: userRequestPreferences.defaultDeliveryAddressTypeId,
                  countryId: 'US' }]);
                cy.createUserRequestPreferencesApi(userRequestPreferences);
              });
          });
      });
  });

  /*afterEach(() => {
    InventoryInstances.deleteInstanceViaApi(itemBarcode);
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(order => {
        cy.deleteOrderApi(order[0].id);
      });
    cy.getOrganizationApi()
      .then(organization => {
        cy.deleteOrganizationApi(organization[0].id);
      });
    Requests.getRequestApi({ limit: 1, query: `"item.barcode"=="${itemBarcode}"` })
      .then(requests => {
        requests.forEach(request => {
          Requests.deleteRequestApi(request.id);
        });
      });
    cy.wrap(UsersEditPage.changeServicePointPreferenceViaApi(user.userId, [effectiveLocationServicePoint.id]))
      .then(() => {
        cy.deleteServicePoint(effectiveLocationServicePoint.id);
        cy.deleteServicePoint(notEffectiveLocationServicePoint.id);
        Users.deleteViaApi(user.userId);
      });
  });*/

  const openItem = (title, itemLocation, barcode) => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', title);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(itemLocation);
    InventoryInstance.openItemView(barcode);
  };

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    const caption = `autotest_caption_${getRandomPostfix()}`;
    const numberOfPieces = '3';

    // open order and create Item
    Orders.selectOrderWithNumber(orderNumber);
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    openItem(instanceTitle, effectiveLocation.name, 'No barcode');
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.onOrder);
    cy.log('###On order###');

    // receive item
    Orders.selectOrderWithNumber(orderNumber);
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, itemBarcode);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inProcess);
    cy.log('###In process###');

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // mark item as missing
    ItemVeiw.clickMarkAsMissing();
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.missing);
    cy.log('###Missing###');

    // check in item at service point assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmMissingModal();
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // heck in item at service point assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // check in item at service point not assigned to its effective location
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    cy.visit(TopMenu.checkInPath);
    cy.wait(25000);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // check in item at service point not assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');

    // create Page request on an item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest({
      itemBarcode,
      itemTitle: null,
      requesterBarcode: userBarcode,
      pickupServicePoint: effectiveLocationServicePoint.name,
    });
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.paged);
    cy.log('###Paged###');

    // check in item at a service point other than the pickup service point for the request
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmInTransitModal();
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.inTransit);
    cy.log('###In transit###');

    // check in item at the pickup service point for the page request
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    CheckInActions.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingPickup);
    cy.log('###Awaiting pickup###');

    // check out item to user for whom page request was created
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupCheckInModal();
    CheckOut.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // declare item lost
    cy.visit(TopMenu.usersPath);
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

    // renew item (through override)
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(user.username);
    UsersSearchPane.openUser(user.userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
    UserLoans.renewItem(itemBarcode);
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    UserLoans.openItemRecordInInventory(itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // edit item record so that it has multiple pieces
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    InventoryInstance.openEditItemPage();
    ItemVeiw.addPieceToItem(numberOfPieces);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // create delivery request (hold or recall) on item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createDeliveryRequest({
      itemBarcode,
      itemTitle: null,
      requesterBarcode: userForDeliveryRequest.barcode,
    });
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, itemBarcode);
    ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingDelivery);
    cy.log('###Awaiting delivery###');

    // check out item to user with delivery request
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupCheckInModal();
    CheckOut.openItemRecordInInventory(itemBarcode);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);
    cy.log('###Checked out###');

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    CheckInActions.openItemRecordInInventory(itemBarcode);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
    cy.log('###Available###');
  });
});
