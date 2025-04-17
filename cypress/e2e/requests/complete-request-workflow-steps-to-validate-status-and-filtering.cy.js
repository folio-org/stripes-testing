import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import AwaitingPickupForARequest from '../../support/fragments/checkin/modals/awaitingPickupForARequest';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import { Locations } from '../../support/fragments/settings/tenant';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';

describe('Requests', () => {
  let itemData;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  const checkInResultsData = {
    statusForS: [`In transit - ${testData.requestServicePoint.name}`],
    statusForS1: ['Awaiting pickup'],
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.userServicePoint);
    ServicePoints.createViaApi(testData.requestServicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.userServicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.createTempUser([
      Permissions.uiRequestsAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.checkoutAll.gui,
      Permissions.checkinAll.gui,
      Permissions.usersViewRequests.gui,
    ])
      .then((userProperties) => {
        testData.user = userProperties;
        itemData = testData.folioInstances[0];
      })
      .then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.userServicePoint.id, testData.requestServicePoint.id],
          testData.user.userId,
          testData.userServicePoint.id,
        );
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: itemData.holdingId,
          instanceId: itemData.instanceId,
          item: { barcode: itemData.barcodes[0] },
          itemId: itemData.itemIds[0],
          pickupServicePointId: testData.requestServicePoint.id,
          requestDate: new Date(),
          requestExpirationDate: new Date(new Date().getTime() + 86400000),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: testData.user.userId,
        }).then((createdRequest) => {
          testData.requestId = createdRequest.body.id;
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.requestId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    ServicePoints.deleteViaApi(testData.requestServicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: itemData,
      servicePoint: testData.requestServicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(testData.user.userId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C557 Complete request workflow steps to validate status change and filtering (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'C557'] },
    () => {
      // Check in Item for which the request was created
      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS);
      CheckInActions.openRequestDetails(itemData.barcodes[0]);
      RequestDetail.checkRequestStatus('Open - In transit');
      CheckInActions.openCheckInPane();
      // Change your logged in service point to match the pickup service point for your request
      SwitchServicePoint.switchServicePoint(testData.requestServicePoint.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.requestServicePoint.name);
      // Check in Item for which the request was created again
      CheckInActions.checkInItemGui(itemData.barcodes[0]);
      AwaitingPickupForARequest.verifyModalTitle();
      AwaitingPickupForARequest.unselectCheckboxPrintSlip();
      AwaitingPickupForARequest.closeModal();
      CheckInPane.checkResultsInTheRow(checkInResultsData.statusForS1);
      CheckInActions.openRequestDetails(itemData.barcodes[0]);
      RequestDetail.checkRequestStatus('Open - Awaiting pickup');
      // Check the item out to the requester

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();
      CheckOutActions.checkOutUser(testData.user.barcode);
      CheckOutActions.checkOutItem(itemData.barcodes[0]);
      CheckOutActions.closeItemsAwaitingPickupModal();
      CheckOutActions.checkOutItem(itemData.barcodes[0]);
      CheckOutActions.checkItemInfo(itemData.barcodes[0], itemData.instanceTitle);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.findCreatedRequest(testData.user.barcode);
      Requests.selectFirstRequest(itemData.instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.checkItemStatus('Checked out');
      RequestDetail.checkRequestStatus('Closed - Filled');
      // Open request details page for just closed request > click on "Actions" menu
      RequestDetail.verifyEditButtonAbsent();
      // Click on Requester barcode link on the request details page > expand "Requests" accordion
      RequestDetail.openRequesterByBarcode(testData.user.barcode);
      UsersCard.expandRequestsSection('0', '1');
    },
  );
});
