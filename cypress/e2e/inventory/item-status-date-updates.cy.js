/* eslint-disable cypress/no-unnecessary-waiting */
import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';
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
import CheckOut from '../../support/fragments/checkout/checkout';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import CheckInModals from '../../support/fragments/check-in-actions/checkInModals';
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
import ItemActions from '../../support/fragments/inventory/inventoryItem/itemActions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NewMaterialType from '../../support/fragments/settings/inventory/newMaterialType';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import CheckOutModals from '../../support/fragments/check-out-actions/checkOutModals';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';

describe('inventory', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  const itemBarcode = Helper.getRandomBarcode();
  const userName = Cypress.env('diku_login');
  const ownerId = uuid();
  let orderNumber;
  let effectiveLocationServicePoint;
  let notEffectiveLocationServicePoint;
  let effectiveLocation;
  let addedCirculationRule;
  let originalCirculationRules;
  let userForDeliveryRequest = {};
  let materialTypeId;

  before('create test data', () => {
    cy.loginAsAdmin();
    cy.getAdminToken();
    NewMaterialType.createViaApi(NewMaterialType.getDefaultMaterialType())
      .then(mtypes => {
        materialTypeId = mtypes.body.id;

        CirculationRules.getViaApi().then((circulationRule) => {
          originalCirculationRules = circulationRule.rulesAsText;
          const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
          const defaultProps = ` i ${ruleProps.i} r ${ruleProps.r} o ${ruleProps.o} n ${ruleProps.n} l ${ruleProps.l}`;

          addedCirculationRule = ` \nm ${materialTypeId}:${defaultProps}`;
          cy.updateCirculationRules({ rulesAsText: `${originalCirculationRules}${addedCirculationRule}` });
        });
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' })
          .then((servicePoints) => {
            effectiveLocationServicePoint = servicePoints[0];
            NewLocation.createViaApi(NewLocation.getDefaultLocation(effectiveLocationServicePoint.id))
              .then((location) => {
                effectiveLocation = location;
                Orders.createOrderWithOrderLineViaApi(
                  NewOrder.getDefaultOrder(),
                  BasicOrderLine.getDefaultOrderLine(itemQuantity, instanceTitle, effectiveLocation.id, materialTypeId)
                )
                  .then(order => {
                    orderNumber = order;
                  });
              });
            UsersOwners.createViaApi({
              id: ownerId,
              owner: 'AutotestOwner' + getRandomPostfix(),
              servicePointOwner: [
                {
                  value: effectiveLocationServicePoint.id,
                  label: effectiveLocationServicePoint.name,
                },
              ],
            });
          });
      });
    ServicePoints.getViaApi({ limit: 1, query: 'name=="Online"' })
      .then((servicePoints) => {
        notEffectiveLocationServicePoint = servicePoints[0];
      });

    cy.createTempUser([
      permissions.checkoutAll.gui,
      permissions.requestsAll.gui
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

  afterEach('delete test data', () => {
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(order => Orders.deleteOrderViaApi(order[0].id));
    UsersOwners.deleteViaApi(ownerId);
    Users.deleteViaApi(userForDeliveryRequest.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
    MaterialTypes.deleteApi(materialTypeId);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      effectiveLocation.institutionId,
      effectiveLocation.campusId,
      effectiveLocation.libraryId,
      effectiveLocation.id
    );
  });

  const openItem = (title, itemLocation, barcode) => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', title);
    InventoryInstances.selectInstance();
    InventoryInstance.openHoldings(itemLocation);
    InventoryInstance.openItemByBarcode(barcode);
  };

  const selectOrderWithNumber = (numberOrder) => {
    Orders.searchByParameter('PO number', numberOrder);
    Orders.selectFromResultsList(numberOrder);
  };

  const fullCheck = (status) => {
    ItemRecordView.verifyUpdatedItemDate();
    ItemRecordView.verifyItemStatus(status);
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
    CheckInActions.checkInItem(barcode);
    // TODO investigate why need 1 min wait before each step
    // it's enough to wait 10000 before and after check in
    cy.wait(10000);
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

  it('C9200 Item status date updates (folijet) (prokopovych)', () => {
    const caption = `autotest_caption_${getRandomPostfix()}`;
    const numberOfPieces = '3';
    // open order and create Item
    cy.visit(TopMenu.ordersPath);
    selectOrderWithNumber(orderNumber);
    Orders.openOrder();
    OrdersHelper.verifyOrderDateOpened();
    openItem(instanceTitle, effectiveLocation.name, 'No barcode');
    fullCheck(ItemRecordView.itemStatuses.onOrder);

    // receive item
    cy.visit(TopMenu.ordersPath);
    selectOrderWithNumber(orderNumber);
    Orders.receiveOrderViaActions();
    Receiving.selectFromResultsList(instanceTitle);
    Receiving.receivePiece(0, caption, itemBarcode);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemRecordView.itemStatuses.inProcess);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemRecordView.itemStatuses.available);

    // mark item as missing
    ItemActions.markAsMissing();
    ItemActions.confirmMarkAsMissing();
    fullCheck(ItemRecordView.itemStatuses.missing);

    // check in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemRecordView.itemStatuses.available, CheckInModals.confirmMissing);

    // check in item at service point assigned to its effective location
    checkIn(itemBarcode, ItemRecordView.itemStatuses.available);

    // check in item at service point not assigned to its effective location
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemRecordView.itemStatuses.inTransit, CheckInModals.confirmInTransit);

    // check in item at service point not assigned to its effective location
    checkIn(itemBarcode, ItemRecordView.itemStatuses.inTransit, CheckInModals.confirmInTransit);

    // check in item at service point assigned to its effective location
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemRecordView.itemStatuses.available);

    // create Page request on an item
    cy.visit(TopMenu.requestsPath);
    NewRequest.createWithUserName({
      itemBarcode,
      requesterName: userName,
      pickupServicePoint: effectiveLocationServicePoint.name
    });
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemRecordView.itemStatuses.paged);

    // check in item at a service point other than the pickup service point for the request
    SwitchServicePoint.switchServicePoint(notEffectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemRecordView.itemStatuses.inTransit, CheckInModals.confirmInTransit);

    // check in item at the pickup service point for the page request
    SwitchServicePoint.switchServicePoint(effectiveLocationServicePoint.name);
    checkIn(itemBarcode, ItemRecordView.itemStatuses.awaitingPickup, CheckInModals.confirmAvaitingPickUp);

    // check out item to user for whom page request was created
    checkOut(userName, itemBarcode, ItemRecordView.itemStatuses.checkedOut, CheckInModals.confirmAvaitingPickupCheckIn);

    // declare item lost
    openUser(userName);
    UserLoans.declareLoanLost(itemBarcode);
    ConfirmItemStatusModal.confirmItemStatus();
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemRecordView.itemStatuses.declaredLost);

    // renew item (through override)
    openUser(userName);
    UserLoans.renewItem(itemBarcode);
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemRecordView.itemStatuses.checkedOut);

    // edit item record so that it has multiple pieces
    InventoryInstance.edit();
    ItemRecordView.addPieceToItem(numberOfPieces);
    fullCheck(ItemRecordView.itemStatuses.checkedOut);

    // create delivery request (hold or recall) on item
    cy.visit(TopMenu.requestsPath);
    cy.wait(8000);
    NewRequest.createDeliveryRequest({
      itemBarcode,
      requesterBarcode: userForDeliveryRequest.barcode,
      requestType: 'Hold'
    });
    cy.wait(8000);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(itemBarcode);
    CheckInModals.confirmMultipieceCheckIn();
    cy.wait(8000);
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkOutItemWithUserName(userName, itemBarcode);
    CheckOutModals.cancelMultipleCheckOut();
    cy.wait(8000);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemRecordView.itemStatuses.awaitingDelivery);

    // check out item to user with delivery request
    checkOut(userForDeliveryRequest.username, itemBarcode, ItemRecordView.itemStatuses.checkedOut, CheckOutModals.confirmMultipieceCheckOut);

    // check in item at service point assigned to its effective location
    cy.visit(TopMenu.checkInPath);
    cy.wait(8000);
    CheckInActions.backdateCheckInItem(DateTools.getPreviousDayDate(), itemBarcode);
    CheckInModals.confirmMultipieceCheckIn();
    cy.wait(8000);
    openItem(instanceTitle, effectiveLocation.name, itemBarcode);
    fullCheck(ItemRecordView.itemStatuses.available);
  });
});
