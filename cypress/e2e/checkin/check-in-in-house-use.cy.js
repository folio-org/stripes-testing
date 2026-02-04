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
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
    servicePointX: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePointY: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let itemAData;
  let itemBData;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePointX);
    ServicePoints.createViaApi(testData.servicePointY);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePointX.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    itemAData = testData.folioInstances[0].items[0];
    itemBData = testData.folioInstances[1].items[0];
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePointX.id, testData.servicePointY.id],
        testData.user.userId,
      );
      Checkout.checkoutItemViaApi({
        itemBarcode: itemAData.barcode,
        servicePointId: testData.servicePointX.id,
        userBarcode: testData.user.barcode,
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.folioInstances[1].holdingId,
        instanceId: testData.folioInstances[1].instanceId,
        item: { barcode: itemBData.barcode },
        itemId: itemBData.id,
        pickupServicePointId: testData.servicePointX.id,
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
          authRefresh: true,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.folioInstances.forEach((instance) => {
      InventoryInstances.deleteInstanceViaApi({
        instance,
        servicePoint: testData.servicePointX,
        shouldCheckIn: true,
      });
    });
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.servicePointX.id,
      testData.servicePointY.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePointX.id);
    ServicePoints.deleteViaApi(testData.servicePointY.id);
    Requests.deleteRequestViaApi(testData.requestsId);
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C9198 Check In: in-house use icon (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C9198'] },
    () => {
      // #1 Navigate to Check In app. Check in checked out item A at service point X.
      CheckInActions.checkInItemGui(itemAData.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, itemAData.barcode]);
      // Check in succeeds. In-house use column is not populated
      CheckInPane.checkInHouseUseIcon(false);
      // #2 Switch user's service point to service point Y. Check in item A.
      SwitchServicePoint.switchServicePoint(testData.servicePointY.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointY.name);
      CheckInActions.checkInItemGui(itemAData.barcode);
      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInPane.checkResultsInTheRow([
        `${ITEM_STATUS_NAMES.IN_TRANSIT} - ${testData.servicePointX.name}`,
        itemAData.barcode,
      ]);
      // Check in succeeds. In-house use column is not populated
      CheckInPane.checkInHouseUseIcon(false);
      // #3 Switch user's service point to service point X. Check in item A.
      SwitchServicePoint.switchServicePoint(testData.servicePointX.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePointX.name);
      CheckInActions.checkInItemGui(itemAData.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, itemAData.barcode]);
      // Check in succeeds. In-house use column is not populated
      CheckInPane.checkInHouseUseIcon(false);
      // #4 Still using service point X, check in item A.
      CheckInActions.checkInItemGui(itemAData.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, itemAData.barcode]);
      // Check in succeeds. In-house use column is populated with house icon.
      CheckInPane.checkInHouseUseIcon(true);
      // #5 Still using service point X, check in item B (available, with at least one open request).
      CheckInActions.checkInItemGui(itemBData.barcode);
      AwaitingPickupForARequest.verifyModalTitle();
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AWAITING_PICKUP, itemBData.barcode]);
      // Check in succeeds. In-house use column is not populated
      CheckInPane.checkInHouseUseIcon(false);
    },
  );
});
