/* eslint-disable cypress/no-unnecessary-waiting */
import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import ItemView from '../../support/fragments/inventory/inventoryItem/itemView';
import Receiving from '../../support/fragments/receiving/receiving';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SwitchServicePoint from '../../support/fragments/servicePoint/switchServicePoint';
import NewRequest from '../../support/fragments/requests/newRequest';
import CheckOut from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
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
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewLocations from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoint from '../../support/fragments/servicePoint/servicePoint';
import Organizations from '../../support/fragments/organizations/organizations';
import Requests from '../../support/fragments/requests/requests';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: Item status date updates', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const effectiveLocationServicePointName = `autotest_service_point_${getRandomPostfix()}`;
  const notEffectiveLocationServicePointName = `autotest_service_point_${getRandomPostfix()}`;
  const itemQuantity = '1';
  let orderNumber;
  let effectiveLocationServicePoint;
  let notEffectiveLocationServicePoint;
  let effectiveLocation;
  let user = {};
  let userForDeliveryRequest = {};
  const itemBarcode = Helper.getRandomBarcode();
  let oldRulesText;
  let requestPolicyId;

  before(() => {
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
        effectiveLocationServicePoint = NewServicePoint.getDefaultServicePoint(effectiveLocationServicePointName);
        notEffectiveLocationServicePoint = NewServicePoint.getDefaultServicePoint(notEffectiveLocationServicePointName);

        ServicePoints.createViaApi(effectiveLocationServicePoint);
        ServicePoints.createViaApi(notEffectiveLocationServicePoint);
        UserEdit.addServicePointsViaApi([effectiveLocationServicePoint.id, notEffectiveLocationServicePoint.id],
          user.userId);

        Requests.setRequestPolicyApi().then(({ oldRulesAsText, policy }) => {
          oldRulesText = oldRulesAsText;
          requestPolicyId = policy.id;
        });

        cy.login(userProperties.username, userProperties.password)
          .then(() => {
            NewLocations.createViaApi(NewLocations.getDefaultLocation(effectiveLocationServicePoint.id))
              .then((location) => {
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
      });

    cy.createTempUser([
      permissions.checkoutAll.gui,
      permissions.requestsAll.gui,
    ])
      .then(userProperties => {
        userForDeliveryRequest = userProperties;
        cy.getUsers({ limit: 1, query: `"username"="${userForDeliveryRequest.username}"` })
          .then((users) => {
            cy.getAddressTypesApi({ limit: 1 }).then(addressTypes => {
              UserEdit.updateUserAddress(users[0], [{ city: 'New York',
                addressTypeId: addressTypes[0].id,
                countryId: 'US' }]);
              cy.createUserRequestPreferencesApi({
                id: uuid(),
                fulfillment: 'Delivery',
                defaultDeliveryAddressTypeId: addressTypes[0].id,
                defaultServicePointId: effectiveLocationServicePoint.id,
                delivery: true,
                holdShelf: true,
                userId: userForDeliveryRequest.userId,
              });
            });
          });
      });
  });

  afterEach(() => {
    CheckInActions.checkinItemViaApi({
      itemBarcode,
      servicePointId: effectiveLocationServicePoint.id,
      checkInDate: new Date().toISOString(),
    })
      .then(() => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemBarcode}"` })
          .then((instance) => {
            cy.deleteItem(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          });
      });
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(order => {
        Orders.deleteOrderApi(order[0].id);
      });
    Organizations.getOrganizationViaApi()
      .then(organization => {
        Organizations.deleteOrganizationViaApi(organization.id);
      });
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [effectiveLocationServicePoint.id]).then(() => {
      ServicePoint.deleteViaApi(effectiveLocationServicePoint.id);
      Users.deleteViaApi(user.userId);
    });
    ServicePoint.deleteViaApi(notEffectiveLocationServicePoint.id);
    Users.deleteViaApi(userForDeliveryRequest.userId);
    Requests.updateCirculationRulesApi(oldRulesText);
    Requests.deleteRequestPolicyApi(requestPolicyId);
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
    ItemView.verifyUpdatedItemDate();
    ItemView.verifyItemStatus(status);
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
    // it's enough to wait 15000 before and after check in
    cy.wait(15000);
    CheckInActions.checkInItem(barcode);
    cy.wait(15000);
    checkOpenItem(barcode, status, confirmModal);
  };

  const checkOut = (specialUserBarcode, specialItemBarcode, status, confirmModalCheck) => {
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkOutItemUser(specialUserBarcode, specialItemBarcode);
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

  it('C9200 Item status date updates (folijet) (prokopovych)', { tags: [TestTypes.smoke, DevTeams.folijet, TestTypes.long] }, () => {
    const caption = `autotest_caption_${getRandomPostfix()}`;
    const numberOfPieces = '3';

    // open order and create Item
    cy.visit(TopMenu.ordersPath);
    selectOrderWithNumber(orderNumber);
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    openItem(instanceTitle, effectiveLocation.name, 'No barcode');
    fullCheck(ItemView.itemStatuses.onOrder);

    // receive item
    cy.visit(TopMenu.ordersPath);
    selectOrderWithNumber(orderNumber);
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, itemBarcode);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemView.itemStatuses.inProcess);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    checkIn(itemBarcode, ItemView.itemStatuses.available);

    // mark item as missing
    ItemView.clickMarkAsMissing();
    fullCheck(ItemView.itemStatuses.missing);

    // check in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemView.itemStatuses.available, ConfirmItemInModal.confirmMissingModal);

    // heck in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemView.itemStatuses.available);

    // check in item at service point not assigned to its effective location
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePointName);
    checkIn(itemBarcode, ItemView.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);
    // TODO запомнить время указ в поле 219 и проверить что после второго чек ин время не изменилось

    // check in item at service point not assigned to its effective location
    checkIn(itemBarcode, ItemView.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    checkIn(itemBarcode, ItemView.itemStatuses.available);

    // create Page request on an item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createNewRequest({
      itemBarcode,
      itemTitle: null,
      requesterBarcode: user.barcode,
      pickupServicePoint: effectiveLocationServicePointName,
    });
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemView.itemStatuses.paged);

    // check in item at a service point other than the pickup service point for the request
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePointName);
    checkIn(itemBarcode, ItemView.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);

    // check in item at the pickup service point for the page request
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    checkIn(itemBarcode, ItemView.itemStatuses.awaitingPickup, ConfirmItemInModal.confirmAvaitingPickUpModal);

    // check out item to user for whom page request was created
    checkOut(user.barcode, itemBarcode, ItemView.itemStatuses.checkedOut);

    // declare item lost
    openUser(user);
    UserLoans.declareLoanLost();
    ConfirmItemStatusModal.confirmItemStatus();
    UserLoans.openItemRecordInInventory(itemBarcode);
    fullCheck(ItemView.itemStatuses.declaredLost);

    // renew item (through override)
    openUser(user);
    UserLoans.renewItem(itemBarcode);
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    UserLoans.openItemRecordInInventory(itemBarcode);
    fullCheck(ItemView.itemStatuses.checkedOut);

    // edit item record so that it has multiple pieces
    InventoryInstance.openEditItemPage();
    ItemView.addPieceToItem(numberOfPieces);
    fullCheck(ItemView.itemStatuses.checkedOut);

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
    checkOut(user.barcode, itemBarcode, ItemView.itemStatuses.awaitingDelivery, ConfirmItemInModal.confirmMultipieceItemModal);

    // check out item to user with delivery request
    checkOut(user.barcode, itemBarcode, ItemView.itemStatuses.checkedOut, ConfirmItemInModal.confirmAvaitingPickupCheckInModal);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePointName);
    checkIn(itemBarcode, ItemView.itemStatuses.available, ConfirmItemInModal.confirmAvaitingPickUpModal);
  });
});
