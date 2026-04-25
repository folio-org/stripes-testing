import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MoveRequest from '../../support/fragments/requests/move-request';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Requests - Move to End of Queue', () => {
  let userData = {}; // Logged-in tester with UI permissions
  let borrower = {}; // Holds item2 to enable RECALL requests
  let user1 = {}; // RECALL requester - position 1
  let user2 = {}; // RECALL requester - position 2
  let user3 = {}; // RECALL requester - position 3
  let user4 = {}; // PAGE requester on item1 - to be moved to end of item2 queue
  const requestIds = [];
  const instanceData = {
    title: getTestEntityValue('InstanceMoveRequestQueue'),
    itemBarcodes: [generateUniqueItemBarcodeWithShift(), generateUniqueItemBarcodeWithShift()],
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          instanceData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          instanceData.loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          instanceData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: instanceData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: instanceData.itemBarcodes[0],
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
            {
              barcode: instanceData.itemBarcodes[1],
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.holdingId = specialInstanceIds.holdingIds[0].id;
          instanceData.itemId1 = specialInstanceIds.holdingIds[0].itemIds[0];
          instanceData.itemId2 = specialInstanceIds.holdingIds[0].itemIds[1];
        });
      });

    cy.createTempUser([
      Permissions.uiRequestsAll.gui,
      Permissions.uiMoveRequest.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      borrower = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        borrower.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      user1 = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        user1.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      user2 = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        user2.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      user3 = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        user3.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      user4 = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        user4.userId,
        testData.userServicePoint.id,
      );
    });

    cy.wrap(null).then(() => {
      // Checkout item2 to borrower - enables RECALL requests on item2
      Checkout.checkoutItemViaApi({
        itemBarcode: instanceData.itemBarcodes[1],
        userBarcode: borrower.barcode,
        servicePointId: testData.userServicePoint.id,
      });
      // Build RECALL queue on item2: user1(pos1), user2(pos2), user3(pos3)
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: instanceData.holdingId,
        instanceId: instanceData.instanceId,
        item: { barcode: instanceData.itemBarcodes[1] },
        itemId: instanceData.itemId2,
        pickupServicePointId: testData.userServicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.RECALL,
        requesterId: user1.userId,
      })
        .then((request1) => {
          requestIds.push(request1.body.id);
          return Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: instanceData.holdingId,
            instanceId: instanceData.instanceId,
            item: { barcode: instanceData.itemBarcodes[1] },
            itemId: instanceData.itemId2,
            pickupServicePointId: testData.userServicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.RECALL,
            requesterId: user2.userId,
          });
        })
        .then((request2) => {
          requestIds.push(request2.body.id);
          return Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: instanceData.holdingId,
            instanceId: instanceData.instanceId,
            item: { barcode: instanceData.itemBarcodes[1] },
            itemId: instanceData.itemId2,
            pickupServicePointId: testData.userServicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.RECALL,
            requesterId: user3.userId,
          });
        })
        .then((request3) => {
          requestIds.push(request3.body.id);
          // user4 places PAGE request on item1 (available) - this is the request to move
          return Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: instanceData.holdingId,
            instanceId: instanceData.instanceId,
            item: { barcode: instanceData.itemBarcodes[0] },
            itemId: instanceData.itemId1,
            pickupServicePointId: testData.userServicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.PAGE,
            requesterId: user4.userId,
          });
        })
        .then((request4) => {
          requestIds.push(request4.body.id);
          testData.requestToMoveId = request4.body.id;
          cy.login(userData.username, userData.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.wrap(requestIds).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      instanceData.itemBarcodes[0],
    );
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(borrower.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(user1.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(user2.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(user3.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(user4.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(borrower.userId);
    Users.deleteViaApi(user1.userId);
    Users.deleteViaApi(user2.userId);
    Users.deleteViaApi(user3.userId);
    Users.deleteViaApi(user4.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C6652 When Moving Request from One Item to Another, Put at End of Queue (vega)',
    { tags: ['extendedPath', 'vega', 'C6652'] },
    () => {
      // Preconditions from TestRail C6652:
      // - Item2 is checked out to borrower
      // - 3 RECALL requests exist on Item2: user1 (pos 1), user2 (pos 2), user3 (pos 3)
      // - 1 PAGE request exists on Item1: user4 (to be moved)
      // Expected: After moving user4's PAGE request to Item2 → appears at position 4 (end of queue)

      Requests.findCreatedRequest(instanceData.itemBarcodes[0]);
      Requests.selectFirstRequest(instanceData.title);
      RequestDetail.waitLoading();

      RequestDetail.openActions();
      RequestDetail.openMoveRequest();
      MoveRequest.waitLoading();
      MoveRequest.chooseItemByRowIndex(0);

      // Handle "Select request type" modal if it appears (PAGE → checked-out item requires type selection)
      MoveRequest.confirmRequestTypeModal();
      MoveRequest.checkIsRequestMovedSuccessfully();
      MoveRequest.openQueueIfNotOpened();

      // Wait for database to update after move operation
      cy.wait(1000);

      // Verify via API that moved request is at the end of the queue
      Requests.verifyMovedRequestAtEndOfQueue(instanceData.itemId2, user4.userId);

      RequestDetail.verifyAccordionsPresence();
      RequestDetail.verifyRequestQueueColumnsPresence(false, true);

      MoveRequest.closeRequestQueue();
      RequestDetail.waitLoading();

      RequestDetail.checkItemInformation({
        itemBarcode: instanceData.itemBarcodes[1],
      });
    },
  );
});
