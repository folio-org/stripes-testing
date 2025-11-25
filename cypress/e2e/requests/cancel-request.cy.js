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
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import { Locations } from '../../support/fragments/settings/tenant';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Title Level Request', () => {
  let itemData;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      TitleLevelRequests.enableTLRViaApi();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });

        itemData = testData.folioInstances[0];
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
            instanceId: itemData.instanceId,
            pickupServicePointId: testData.servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.TITLE,
            requestType: REQUEST_TYPES.PAGE,
            requesterId: testData.user.userId,
          }).then((createdRequest) => {
            testData.requestId = createdRequest.body.id;
          });
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.requestsPath,
              waiter: Requests.waitLoading,
            });
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Requests.deleteRequestViaApi(testData.requestId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceViaApi({
        instance: itemData,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      Locations.deleteViaApi(testData.defaultLocation);
    });
  });

  it(
    'C3533 Cancel request (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'shiftLeft', 'C3533'] },
    () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInActions.verifyLastCheckInItem(itemData.barcodes[0]);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(itemData.instanceTitle);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.checkRequestStatus('Open - Awaiting pickup');
      RequestDetail.checkItemStatus('Awaiting pickup');
      RequestDetail.openActions();
      RequestDetail.verifyCancelRequestOptionDisplayed();

      RequestDetail.openCancelRequest();
      RequestDetail.verifyCancelRequestModalDisplayed();

      RequestDetail.clickOnBackButton();

      RequestDetail.openActions();
      RequestDetail.openCancelRequest();
      RequestDetail.checkRequestCancellationModalInfo();

      RequestDetail.confirmRequestCancellation();
      RequestDetail.checkRequestStatus('Closed - Cancelled');

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);

      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      CheckInActions.verifyLastCheckInItem(itemData.barcodes[0]);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(itemData.instanceTitle);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.checkItemStatus('Available');

      RequestDetail.verifyEditButtonAbsent();

      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Closed - Cancelled',
        level: REQUEST_LEVELS.TITLE,
      });
    },
  );
});
