import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  LOCATION_IDS,
  LOCATION_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Check in', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
  };
  let itemAData;
  let itemBData;
  let servicePointX;
  let servicePointY;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp1) => {
        servicePointX = sp1;
      });
      ServicePoints.getCircDesk2ServicePointViaApi().then((sp2) => {
        servicePointY = sp2;
      });
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
      });
    });
    itemAData = testData.folioInstances[0].items[0];
    itemBData = testData.folioInstances[1].items[0];
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointsViaApi([servicePointX.id, servicePointY.id], testData.user.userId);
      Checkout.checkoutItemViaApi({
        itemBarcode: itemAData.barcode,
        servicePointId: servicePointX.id,
        userBarcode: testData.user.barcode,
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.folioInstances[1].holdingId,
        instanceId: testData.folioInstances[1].instanceId,
        item: { barcode: itemBData.barcode },
        itemId: itemBData.id,
        pickupServicePointId: servicePointX.id,
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
        servicePoint: servicePointX,
        shouldCheckIn: true,
      });
    });
    Requests.deleteRequestViaApi(testData.requestsId);
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
      SwitchServicePoint.switchServicePoint(servicePointY.name);
      SwitchServicePoint.checkIsServicePointSwitched(servicePointY.name);
      CheckInActions.checkInItemGui(itemAData.barcode);
      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInPane.checkResultsInTheRow([
        `${ITEM_STATUS_NAMES.IN_TRANSIT} - ${servicePointX.name}`,
        itemAData.barcode,
      ]);
      // Check in succeeds. In-house use column is not populated
      CheckInPane.checkInHouseUseIcon(false);
      // #3 Switch user's service point to service point X. Check in item A.
      SwitchServicePoint.switchServicePoint(servicePointX.name);
      SwitchServicePoint.checkIsServicePointSwitched(servicePointX.name);
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
