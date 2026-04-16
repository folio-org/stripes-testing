import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import { Locations } from '../../support/fragments/settings/tenant';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';

describe('Requests', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestIds: [],
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      cy.createTempUser([Permissions.uiRequestsAll.gui, Permissions.checkinAll.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointsViaApi(
            [testData.servicePoint.id],
            testData.user.userId,
            testData.servicePoint.id,
          );
          Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: testData.folioInstances[0].holdings[0].id,
            instanceId: testData.folioInstances[0].instanceId,
            item: { barcode: testData.folioInstances[0].barcodes[0] },
            itemId: testData.folioInstances[0].items[0].id,
            pickupServicePointId: testData.servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.PAGE,
            requesterId: testData.user.userId,
          }).then((createdRequest) => {
            testData.requestIds.push(createdRequest.body.id);
          });
          Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: testData.folioInstances[1].holdings[0].id,
            instanceId: testData.folioInstances[1].instanceId,
            item: { barcode: testData.folioInstances[1].barcodes[0] },
            itemId: testData.folioInstances[1].items[0].id,
            pickupServicePointId: testData.servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.PAGE,
            requesterId: testData.user.userId,
          }).then((createdRequest) => {
            testData.requestIds.push(createdRequest.body.id);
          });
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.checkInPath,
              waiter: CheckInActions.waitLoading,
            });
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      testData.requestIds.forEach((requestId) => {
        Requests.deleteRequestViaApi(requestId);
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
      testData.folioInstances.forEach((instance) => {
        InventoryInstances.deleteInstanceViaApi({
          instance,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      Locations.deleteViaApi(testData.defaultLocation);
      FileManager.deleteFileFromDownloadsByMask('*.csv');
    });
  });

  it(
    'C2497 Hold shelf clearance report (vega)',
    { tags: ['extendedPath', 'vega', 'C2497'] },
    () => {
      // Step 1: Check in items to move requests to Awaiting pickup
      CheckInActions.checkInItemGui(testData.folioInstances[0].barcodes[0]);
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInActions.verifyLastCheckInItem(testData.folioInstances[0].barcodes[0]);

      CheckInActions.checkInItemGui(testData.folioInstances[1].barcodes[0]);
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInActions.verifyLastCheckInItem(testData.folioInstances[1].barcodes[0]);

      // Step 2: Cancel first request
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(testData.folioInstances[0].instanceTitle);
      Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
      RequestDetail.checkRequestStatus('Open - Awaiting pickup');
      RequestDetail.openCancelRequestForm();
      RequestDetail.confirmRequestCancellation();
      RequestDetail.checkRequestStatus('Closed - Cancelled');

      // Step 3: Cancel second request
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(testData.folioInstances[1].instanceTitle);
      Requests.selectFirstRequest(testData.folioInstances[1].instanceTitle);
      RequestDetail.checkRequestStatus('Open - Awaiting pickup');
      RequestDetail.openCancelRequestForm();
      RequestDetail.confirmRequestCancellation();
      RequestDetail.checkRequestStatus('Closed - Cancelled');

      // Step 4: Run hold shelf clearance report - both cancelled requests should appear
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      cy.reload();
      Requests.waitLoading();
      Requests.exportExpiredHoldsToCSV();
      FileManager.verifyFileIncludes('*.csv', [
        testData.folioInstances[0].barcodes[0],
        testData.folioInstances[1].barcodes[0],
      ]);

      // Step 5: Check in items to clear them from hold shelf
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.checkInItemGui(testData.folioInstances[0].barcodes[0]);
      CheckInActions.verifyLastCheckInItem(testData.folioInstances[0].barcodes[0]);
      CheckInActions.checkInItemGui(testData.folioInstances[1].barcodes[0]);
      CheckInActions.verifyLastCheckInItem(testData.folioInstances[1].barcodes[0]);

      // Step 6: Run hold shelf clearance report again - items should no longer appear
      FileManager.deleteFileFromDownloadsByMask('*.csv');
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      cy.reload();
      Requests.waitLoading();
      Requests.verifyExpiredHoldsToCSVButtonDisabled();
    },
  );
});
