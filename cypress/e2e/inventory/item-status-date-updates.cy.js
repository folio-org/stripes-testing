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
import NewLocations from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoint from '../../support/fragments/servicePoint/servicePoint';
import Organizations from '../../support/fragments/organizations/organizations';
import Requests from '../../support/fragments/requests/requests';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import DevTeams from '../../support/dictionary/devTeams';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('ui-inventory: Item status date updates', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  let orderNumber;
  let effectiveLocationServicePoint;
  let notEffectiveLocationServicePoint;
  let effectiveLocation;
  const user = {};
  let userForDeliveryRequest = {};
  const itemBarcode = Helper.getRandomBarcode();
  let oldRulesText;
  let requestPolicyId;
  const userName = Cypress.env('diku_login');

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
        // Requests.setRequestPolicyApi().then(({ oldRulesAsText, policy }) => {
        //   oldRulesText = oldRulesAsText;
        //   requestPolicyId = policy.id;
        // });

        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' })
          .then((servicePoints) => {
            effectiveLocationServicePoint = servicePoints[0];
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
        cy.getUsers({ limit: 1, query: `"username"="${userForDeliveryRequest.username}"` })
          .then((users) => {
            cy.getAddressTypesApi({ limit: 1 }).then(addressTypes => {
              UserEdit.updateUserAddress(users[0], [{ city: 'New York',
                addressTypeId: addressTypes[0].id,
                countryId: 'US' }]);
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
        console.log(order);
        Orders.deleteOrderApi(order[0].id);
      });
    Users.deleteViaApi(userForDeliveryRequest.userId);
  });

  const openItem = (title, itemLocation, barcode) => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', title);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(itemLocation);
    InventoryInstance.openItemView(barcode);
  };

  const selectOrderWithNumber = (numberOrder) => {
    Orders.searchByParameter('PO number', numberOrder);
    Orders.selectFromResultsList(numberOrder);
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

  const checkOut = (specialUserName, specialItemBarcode, status, confirmModalCheck) => {
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkOutItemWithUserName(specialUserName, specialItemBarcode);
    if (confirmModalCheck) {
      confirmModalCheck();
    }
    CheckOut.openItemRecordInInventory(itemBarcode);
    fullCheck(status);
  };

  const openUser = (name) => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(name);
    UsersSearchPane.selectUserFromList(name);
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
    Receiving.selectFromResultsList(instanceTitle);
    Receiving.receivePiece(0, caption, itemBarcode);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemView.itemStatuses.inProcess);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemView.itemStatuses.available);

    // mark item as missing
    ItemView.clickMarkAsMissing();
    fullCheck(ItemView.itemStatuses.missing);

    // check in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemView.itemStatuses.available, ConfirmItemInModal.confirmMissingModal);

    // check in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemView.itemStatuses.available);

    // check in item at service point not assigned to its effective location
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemView.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);

    // check in item at service point not assigned to its effective location
    checkIn(itemBarcode, ItemView.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemView.itemStatuses.available);

    // create Page request on an item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createWithUserName({
      itemBarcode,
      requesterName: userName,
      pickupServicePoint: effectiveLocationServicePoint.name
    });
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemView.itemStatuses.paged);

    // check in item at a service point other than the pickup service point for the request
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemView.itemStatuses.inTransit, ConfirmItemInModal.confirmInTransitModal);

    // check in item at the pickup service point for the page request
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemView.itemStatuses.awaitingPickup, ConfirmItemInModal.confirmAvaitingPickUpModal);

    // check out item to user for whom page request was created
    checkOut(userName, itemBarcode, ItemView.itemStatuses.checkedOut, ConfirmItemInModal.confirmAvaitingPickupCheckInModal);

    // declare item lost
    openUser(userName);
    UserLoans.declareLoanLost(itemBarcode);
    ConfirmItemStatusModal.confirmItemStatus();
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemView.itemStatuses.declaredLost);

    // renew item (through override)
    openUser(userName);
    UserLoans.renewItem(itemBarcode);
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
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
    fullCheck(ItemView.itemStatuses.awaitingDelivery);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    ConfirmItemInModal.confirmMultipieceCheckInModal();
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkOutItemWithUserName(userName, itemBarcode);
    CheckOutActions.cancelMultipleCheckOutModal();
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemView.itemStatuses.awaitingDelivery);

    // check out item to user with delivery request
    checkOut(userForDeliveryRequest.username, itemBarcode, ItemView.itemStatuses.checkedOut, CheckOutActions.confirmMultipieceCheckOut(itemBarcode));

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemView.itemStatuses.available, ConfirmItemInModal.confirmAvaitingPickUpModal);
  });
});
