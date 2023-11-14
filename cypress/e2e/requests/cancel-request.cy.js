import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import { Locations } from '../../support/fragments/settings/tenant';

describe('Title Level Request', () => {
  let itemData;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
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

        itemData = testData.folioInstances[0];
      });
      cy.createTempUser([Permissions.requestsAll.gui, Permissions.checkinAll.gui])
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
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
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
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInActions.verifyLastCheckInItem(itemData.barcodes[0]);
      cy.visit(TopMenu.requestsPath);
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

      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      CheckInActions.verifyLastCheckInItem(itemData.barcodes[0]);
      cy.visit(TopMenu.requestsPath);
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
