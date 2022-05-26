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
import Requests from '../../support/fragments/requests/requests';
import UpdateUser from '../../support/fragments/user/updateUser';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewLocations from '../../support/fragments/settings/tenant/locations/newLocation';

// TODO: When bug(https://issues.folio.org/browse/MSEARCH-361) will be fixed check full run test!!!
describe('ui-inventory: Item status date updates', () => {
  const instanceTitle = `autotest_title_${getRandomPostfix()}`;
  const itemQuantity = '1';
  let orderNumber;
  let effectiveLocationServicePoint;
  let effectiveLocationServicePointName;
  let notEffectiveLocationServicePoint;
  let notEffectiveLocationServicePointName;
  let effectiveLocation;
  let user = {};
  let userForDeliveryRequest = {};
  let userBarcode = '';
  const userItemBarcode = Helper.getRandomBarcode();
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
        effectiveLocationServicePointName = effectiveLocationServicePoint.body.name;
        const effectiveLocationServicePointId = effectiveLocationServicePoint.body.id;
        notEffectiveLocationServicePoint = NewServicePoint.getDefaulServicePoint();
        notEffectiveLocationServicePointName = notEffectiveLocationServicePoint.body.name;

        userRequestPreferences = {
          id: uuid(),
          fulfillment: 'Delivery',
          defaultDeliveryAddressTypeId: null,
          defaultServicePointId: effectiveLocationServicePointId,
          delivery: true,
          holdShelf: true,
          userId: userForDeliveryRequest.id,
        };

        ServicePoints.createViaApi(effectiveLocationServicePoint.body);
        ServicePoints.createViaApi(notEffectiveLocationServicePoint.body);
        cy.addServicePointToUser([effectiveLocationServicePoint.body.id, notEffectiveLocationServicePoint.body.id],
          user.userId, effectiveLocationServicePoint.body.id);
        cy.login(userProperties.username, userProperties.password)
          .then(() => {
            NewLocations.createViaApi(NewLocations.getDefaultLocation(effectiveLocationServicePointId))
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

  afterEach(() => {
    InventoryInstances.deleteInstanceViaApi(userItemBarcode);
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(order => {
        cy.deleteOrderApi(order[0].id);
      });
    cy.getOrganizationApi()
      .then(organization => {
        cy.deleteOrganizationApi(organization[0].id);
      });
    cy.deleteServicePoint(notEffectiveLocationServicePoint.body.id);
    SwitchServicePoint.changeServicePointPreference(user.username);
    Requests.getRequestApi({ limit: 1, query: `"item.barcode"=="${userItemBarcode}"` })
      .then(requests => {
        requests.forEach(request => {
          Requests.deleteRequestApi(request.id);
        });
      });
    cy.deleteUser(user.userId);
  });

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    const caption = `autotest_caption_${getRandomPostfix()}`;
    const numberOfPieces = '3';

    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Helper.selectFromResultsList();
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    InventoryInstances.openItem(instanceTitle, effectiveLocation.name, 'No barcode');
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.onOrder);

    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Helper.selectFromResultsList();
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, userItemBarcode);
    InventoryInstances.openItem(instanceTitle, effectiveLocation.name, userItemBarcode);
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
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
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
    InventoryInstances.openItem(instanceTitle, effectiveLocation.name, userItemBarcode);
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

    InventoryInstances.openItem(instanceTitle, effectiveLocation.name, userItemBarcode);
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
    ConfirmItemInModal.confirmAvaitingPicupModal();
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, userItemBarcode);
    ConfirmMultiplePiecesItemCheckOut.confirmMultiplePiecesItemModal();
    InventoryInstances.openItem(instanceTitle, effectiveLocation.name, userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.awaitingDelivery);

    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(userBarcode, userItemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupCheckInModal();
    CheckOut.openItemRecordInInventory(userItemBarcode);
    InventoryInstances.openItem(instanceTitle, effectiveLocation.name, userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.checkedOut);

    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(userItemBarcode);
    ConfirmItemInModal.confirmAvaitingPicupModal();
    CheckInActions.openItemRecordInInventory(ItemVeiw.itemStatuses.available);
    InventoryInstances.openItem(instanceTitle, effectiveLocation.name, userItemBarcode);
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(ItemVeiw.itemStatuses.available);
  });
});
