import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Check in and Request handling', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let instanceData;

  before('Create test data', () => {
    cy.getAdminToken();
    cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
      testData.holdingTypeId = holdingTypes[0].id;
    });
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    Requests.getRequestApi({ query: '(requestLevel=="Title")' }).then((requestResponse) => {
      requestResponse.forEach((response) => Requests.deleteRequestViaApi(response.id));
    });
    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      );
      instanceData = testData.folioInstances[0];
      TitleLevelRequests.enableTLRViaApi();
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.holdingTypeId,
        instanceId: instanceData.instanceId,
        item: { barcode: instanceData.barcodes[0] },
        itemId: instanceData.itemIds[0],
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.user.userId,
      }).then((request) => {
        testData.requestId = request.body.id;
      });
      CheckInActions.checkinItemViaApi({
        itemBarcode: instanceData.barcodes[0],
        servicePointId: testData.servicePoint.id,
        checkInDate: new Date().toISOString(),
      });

      cy.waitForAuthRefresh(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.requestId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(testData.user.userId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C350426 Check that request goes to "Fulfillment in progress" if the items status has changed to "Awaiting pickup" (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C350426'] },
    () => {
      // Open Request detail page
      Requests.findCreatedRequest(testData.user.barcode);
      Requests.selectFirstRequest(instanceData.instanceTitle);
      RequestDetail.waitLoading();
      // Pay attention on the Request status and Item status
      RequestDetail.checkRequestStatus('Open - Awaiting pickup');
      RequestDetail.checkItemStatus('Awaiting pickup');
      // Click On the Action button
      RequestDetail.verifyActionsAvailableOptions([
        'Edit',
        'Cancel request',
        'Duplicate',
        'Reorder queue',
      ]);
      // Click on the Reorder queue
      RequestDetail.requestQueueOnInstance(instanceData.instanceTitle);
      // Pay attention on the Request
      RequestDetail.checkRequestMovedToFulfillmentInProgress(instanceData.barcodes[0]);
    },
  );
});
