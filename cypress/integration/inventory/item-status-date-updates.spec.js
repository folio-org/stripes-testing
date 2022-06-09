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
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
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

  before(() => {,
    // TODO rewrite with user diku_admin
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

  afterEach(() => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemBarcode}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(order => {
        cy.deleteOrderApi(order[0].id);
      });
    cy.getOrganizationApi()
      .then(organization => {
        cy.deleteOrganizationApi(organization[0].id);
      });
    CheckInActions.createItemCheckinApi({
      itemBarcode,
      servicePointId: effectiveLocationServicePoint.id,
      checkInDate: '2021-09-30T16:14:50.444Z',
    });
    cy.wrap(UsersEditPage.changeServicePointPreferenceViaApi(user.userId, [effectiveLocationServicePoint.id]))
      .then(() => {
        cy.deleteServicePoint(effectiveLocationServicePoint.id);
        cy.deleteServicePoint(notEffectiveLocationServicePoint.id);
        Users.deleteViaApi(user.userId);
      });
  });

  const openItem = (title, itemLocation, barcode) => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', title);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(itemLocation);
    InventoryInstance.openItemView(barcode);
  };

  const selectOrderWithNumber = (numberOrder) => {
    Orders.searchByParameter('PO number', numberOrder);
    Helper.selectFromResultsList();
  };

  const fullCheck = (status) => {
    ItemVeiw.verifyUpdatedItemDate();
    ItemVeiw.verifyItemStatus(status);
    cy.log(`###${status}###`);
  };

  const checkOpenItem = (barcode, status, confirmModal) => {
    if (confirmModal) {
      confirmModal();
    }
    CheckInActions.openItemRecordInInventory(barcode);
    fullCheck(status);
  };

  const checkIn = (barcode, status, confirmModal) => {
    cy.visit(TopMenu.checkInPath);
    // TODO investigate why need 1 min wait before each step
    cy.wait(15000);
    CheckInActions.checkInItem(barcode);
    cy.wait(15000);
    checkOpenItem(barcode, status, confirmModal);
  };

  const checkOut = (specialUserBarcode, specialItemBarcode, status, confirmModalCheck) => {
    cy.visit(TopMenu.checkOutPath);
    CheckOut.checkOutItem(specialUserBarcode, specialItemBarcode);
    if (confirmModalCheck) {
      confirmModalCheck();
    }
    CheckOut.openItemRecordInInventory(itemBarcode);
    fullCheck(status);
  };

  const openUser = ({ username, userId }) => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(username);
    UsersSearchPane.openUser(userId);
    UsersCard.openLoans();
    UsersCard.showOpenedLoans();
  };

  it('C9200 Item status date updates', { tags: [TestTypes.smoke, TestTypes.long] }, () => {
    const caption = `autotest_caption_${getRandomPostfix()}`;
    const numberOfPieces = '3';

    // open order and create Item
    cy.visit(TopMenu.ordersPath);
    selectOrderWithNumber(orderNumber);
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    openItem(instanceTitle, effectiveLocation.name, 'No barcode');
    fullCheck(ItemVeiw.itemStatuses.onOrder);

    // receive item
    cy.visit(TopMenu.ordersPath);
    selectOrderWithNumber(orderNumber);
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, itemBarcode);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemVeiw.itemStatuses.inProcess);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemVeiw.itemStatuses.available);

    // mark item as missing
    ItemVeiw.clickMarkAsMissing();
    fullCheck(ItemVeiw.itemStatuses.missing);

    // check in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemVeiw.itemStatuses.available, ConfirmItemInModal.confirmMissingModal);

    // heck in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemVeiw.itemStatuses.available);

    // check in item at service point not assigned to its effective location
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemVeiw.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);
    // TODO запомнить время указ в поле 219 и проверить что после второго чек ин время не изменилось

    // check in item at service point not assigned to its effective location
    checkIn(itemBarcode, ItemVeiw.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemVeiw.itemStatuses.available);

    // create Page request on an item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest({
      itemBarcode,
      itemTitle: null,
      requesterBarcode: userBarcode,
      pickupServicePoint: effectiveLocationServicePoint.name,
    });
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemVeiw.itemStatuses.paged);

    // check in item at a service point other than the pickup service point for the request
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemVeiw.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);

    // check in item at the pickup service point for the page request
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemVeiw.itemStatuses.awaitingPickup, ConfirmItemInModal.confirmAvaitingPickUpModal);

    // check out item to user for whom page request was created
    checkOut(userBarcode, itemBarcode, ItemVeiw.itemStatuses.checkedOut, ConfirmItemInModal.confirmAvaitingPickupCheckInModal);

    // declare item lost
    openUser(user);
    UserLoans.declareLoanLost();
    ConfirmItemStatusModal.confirmItemStatus();
    UserLoans.openItemRecordInInventory(itemBarcode);
    fullCheck(ItemVeiw.itemStatuses.declaredLost);

    // renew item (through override)
    openUser(user);
    UserLoans.renewItem(itemBarcode);
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    UserLoans.openItemRecordInInventory(itemBarcode);
    fullCheck(ItemVeiw.itemStatuses.checkedOut);

    // edit item record so that it has multiple pieces
    InventoryInstance.openEditItemPage();
    ItemVeiw.addPieceToItem(numberOfPieces);
    fullCheck(ItemVeiw.itemStatuses.checkedOut);

    // create delivery request (hold or recall) on item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createDeliveryRequest({
      itemBarcode,
      itemTitle: null,
      requesterBarcode: userForDeliveryRequest.barcode,
    });
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmAvaitingPickUpModal();
    checkOut(userBarcode, itemBarcode, ItemVeiw.itemStatuses.awaitingDelivery, ConfirmItemInModal.confirmMultipieceItemModal);

    // check out item to user with delivery request
    checkOut(userBarcode, itemBarcode, ItemVeiw.itemStatuses.checkedOut, ConfirmItemInModal.confirmAvaitingPickupCheckInModal);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemVeiw.itemStatuses.available, ConfirmItemInModal.confirmAvaitingPickUpModal);
  });
});
