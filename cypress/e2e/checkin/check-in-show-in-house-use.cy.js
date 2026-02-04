import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import Requests from '../../support/fragments/requests/requests';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Check in', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ itemsCount: 3 }),
    itemServicePoint1: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let itemAData;
  let itemBData;
  let itemCData;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    ServicePoints.createViaApi(testData.itemServicePoint1);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    itemAData = testData.folioInstances[0].items[0];
    itemBData = testData.folioInstances[0].items[1];
    itemCData = testData.folioInstances[0].items[2];
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id, testData.itemServicePoint1.id],
        testData.user.userId,
      );
      Checkout.checkoutItemViaApi({
        itemBarcode: itemAData.barcode,
        servicePointId: testData.servicePoint.id,
        userBarcode: testData.user.barcode,
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.folioInstances[0].holdingId,
        instanceId: testData.folioInstances[0].instanceId,
        item: { barcode: itemBData.barcode },
        itemId: itemBData.id,
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestExpirationDate: new Date(new Date().getTime() + 86400000),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.user.userId,
      }).then((request) => {
        testData.requestsId = request.body.id;
        itemBData.servicePoint = request.body.pickupServicePoint.name;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.servicePoint.id,
      testData.itemServicePoint1.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    ServicePoints.deleteViaApi(testData.itemServicePoint1.id);
    Requests.deleteRequestViaApi(testData.requestsId);
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C9182 Check In: show in-house use (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C9182'] },
    () => {
      // Check in an item that's loaned (item A)
      CheckInActions.checkInItemGui(itemAData.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, itemAData.barcode]);
      CheckInPane.checkInHouseUseIcon(false);
      // Check in an item with at least one open request (item B)
      CheckInActions.checkInItemGui(itemBData.barcode);
      AwaitingPickupForARequest.verifyModalTitle();
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AWAITING_PICKUP, itemBData.barcode]);
      CheckInPane.checkInHouseUseIcon(false);
      // Switch user to service point that is not the primary service point for the effective location for item C
      SwitchServicePoint.switchServicePoint(testData.itemServicePoint1.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.itemServicePoint1.name);

      // Check in item C
      CheckInActions.checkInItemGui(itemCData.barcode);
      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInPane.checkResultsInTheRow([
        `${ITEM_STATUS_NAMES.IN_TRANSIT} - ${testData.servicePoint.name}`,
        itemCData.barcode,
      ]);
      CheckInPane.checkInHouseUseIcon(false);
      // Change user's service point to the service point that is the primary service point for the item's effective location
      SwitchServicePoint.switchServicePoint(testData.servicePoint.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePoint.name);
      // Check in item C again
      CheckInActions.checkInItemGui(itemCData.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, itemCData.barcode]);
      CheckInPane.checkInHouseUseIcon(false);
    },
  );
});
